import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

import { parseDocumentation } from './documentation-parser.mjs';

/**
 * Validate the integration contract between API-page authoring and compat-data
 * authoring. This checker does not judge platform support values; it verifies
 * that each MDX query resolves to a compat identifier with the shape required
 * by APISummary or APITable.
 */
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = realpathSync(fileURLToPath(import.meta.url));
const defaultCompatRoot = path.join(repoRoot, 'packages/lynx-compat-data');

/**
 * Normalize native filesystem separators for Git-style documentation paths.
 *
 * @param {string} value Native or POSIX path.
 * @returns {string} Path using POSIX separators.
 */
function toPosix(value) {
  return value.split(path.sep).join('/');
}

/**
 * Select authored API MDX pages and exclude API-only partials.
 *
 * @param {string} file Repository-relative POSIX path.
 * @returns {boolean} Whether the checker owns this file.
 */
function isApiDocument(file) {
  return (
    (file.startsWith('docs/en/api/') || file.startsWith('docs/zh/api/')) &&
    file.endsWith('.mdx') &&
    !file.endsWith('-API.mdx')
  );
}

/**
 * Return every tracked API document for the CI and local full-tree scan.
 *
 * @returns {string[]} Repository-relative paths to inspect.
 */
function trackedApiDocuments() {
  return execFileSync('git', ['ls-files', '-z', 'docs/en/api', 'docs/zh/api'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(isApiDocument);
}

const apiComponentNames = new Set(['APISummary', 'APITable']);

/**
 * Yield compatibility component opening elements from embedded ESTree.
 *
 * @param {object} node ESTree node.
 * @yields {object} Normalized APISummary or APITable component.
 */
function* estreeApiComponents(node) {
  if (
    node.type === 'JSXOpeningElement' &&
    node.name?.type === 'JSXIdentifier' &&
    apiComponentNames.has(node.name.name)
  ) {
    yield {
      name: node.name.name,
      attributes: node.attributes,
      line: node.loc?.start.line,
    };
  }

  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string'
      ) {
        yield* estreeApiComponents(child);
      }
    }
  }
}

/**
 * Walk MDX and embedded ESTree and yield normalized compatibility components.
 *
 * @param {object} node MDX syntax-tree node.
 * @yields {object} Normalized APISummary or APITable component.
 */
function* apiComponents(node) {
  if (
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    apiComponentNames.has(node.name)
  ) {
    yield {
      name: node.name,
      attributes: node.attributes,
      line: node.position?.start.line,
    };
  }

  if (node.data?.estree) {
    yield* estreeApiComponents(node.data.estree);
  }

  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string'
      ) {
        yield* apiComponents(child);
      }
    }
  }
}

/**
 * Read a statically known JSX attribute value in the forms supported by MDX:
 * `query="x"`, `query='x'`, and `query={'x'}`.
 *
 * @param {object} attribute MDX or ESTree JSX attribute node.
 * @returns {string | undefined} Static string, or undefined for dynamic input.
 */
function staticAttributeValue(attribute) {
  if (typeof attribute.value === 'string') {
    return attribute.value;
  }

  let expression = attribute.value?.data?.estree?.body?.[0]?.expression;
  if (attribute.value?.type === 'JSXExpressionContainer') {
    expression = attribute.value.expression;
  } else if (attribute.value?.type === 'Literal') {
    expression = attribute.value;
  }
  if (expression?.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value;
  }
  return undefined;
}

/**
 * Read an attribute name from MDX or ESTree JSX.
 *
 * @param {object} attribute MDX or ESTree JSX attribute node.
 * @returns {string | undefined} Simple attribute name.
 */
function attributeName(attribute) {
  if (attribute.type === 'mdxJsxAttribute') {
    return attribute.name;
  }
  if (
    attribute.type === 'JSXAttribute' &&
    attribute.name?.type === 'JSXIdentifier'
  ) {
    return attribute.name.name;
  }
  return undefined;
}

/**
 * Resolve a component's effective query, preferring its explicit attribute and
 * falling back to the page's `api` frontmatter.
 *
 * @param {object} component APISummary or APITable MDX node.
 * @param {unknown} frontmatterApi Parsed frontmatter value.
 * @returns {{query: string} | {error: string}} Query or authoring error.
 */
function componentQuery(component, frontmatterApi) {
  const queryAttribute = component.attributes.find(
    (attribute) => attributeName(attribute) === 'query',
  );
  if (queryAttribute) {
    const query = staticAttributeValue(queryAttribute);
    return query === undefined || query.length === 0
      ? { error: 'query must be a static string' }
      : { query };
  }
  return typeof frontmatterApi === 'string' && frontmatterApi
    ? { query: frontmatterApi }
    : { error: 'query is missing and frontmatter has no api value' };
}

/**
 * Split the runtime query syntax into the JSON module path and dot-separated
 * accessor used by APISummary and APITable.
 *
 * @param {string} query Compatibility query such as `test/api.member`.
 * @returns {{module: string, accessor: string} | {error: string}}
 *   Runtime lookup coordinates or a syntax error.
 */
export function parseCompatQuery(query) {
  if (query.split(/[/.]/).some((segment) => segment.length === 0)) {
    return { error: 'query contains an empty path segment' };
  }

  const parts = query.split('/');
  const lastPart = parts.at(-1);
  const dotIndex = lastPart.indexOf('.');
  if (dotIndex === -1) {
    return { module: query, accessor: parts.join('.') };
  }
  return {
    module: `${parts.slice(0, -1).join('/')}/${lastPart.slice(0, dotIndex)}`,
    accessor: parts.join('.').replaceAll('/', '.'),
  };
}

/**
 * Build a cached filesystem resolver for authored compatibility queries.
 *
 * @param {string} compatRoot Root directory of the compat-data package.
 * @returns {(query: string) => {direct: boolean} | {error: string}}
 *   Query resolver.
 */
export function createCompatResolver(compatRoot = defaultCompatRoot) {
  const cache = new Map();
  const normalizedRoot = path.resolve(compatRoot);

  return function resolveCompat(query) {
    const parsed = parseCompatQuery(query);
    if (parsed.error) {
      return parsed;
    }
    const { module, accessor } = parsed;
    const file = path.resolve(normalizedRoot, `${module}.json`);
    if (!file.startsWith(`${normalizedRoot}${path.sep}`)) {
      return { error: 'query resolves outside the compatibility data root' };
    }

    let data = cache.get(file);
    if (!data) {
      try {
        data = JSON.parse(readFileSync(file, 'utf8'));
        cache.set(file, data);
      } catch (error) {
        return {
          error:
            error.code === 'ENOENT'
              ? `compatibility module does not exist: ${module}`
              : `could not read compatibility module ${module}: ${error.message}`,
        };
      }
    }

    const target = accessor
      .split('.')
      .reduce((value, key) => value?.[key], data);
    if (!target || typeof target !== 'object') {
      return { error: `compatibility target does not exist: ${query}` };
    }
    return { direct: Boolean(target.__compat) };
  };
}

/**
 * Validate compatibility components in one API page.
 *
 * Rules:
 * - every component needs a static explicit query or string `api` frontmatter;
 * - APISummary and APITable targets must contain a direct `__compat`;
 * - an API page containing a table must also contain one valid summary.
 *
 * A summary and a table may use different queries when one API page documents
 * related compatibility records.
 *
 * @param {string} file Repository-relative document path.
 * @param {string} content Raw MDX source.
 * @param {{resolveCompat?: Function}} options Resolver injection for tests.
 * @returns {Array<object>} Sorted authoring-contract violations.
 */
export function findApiSummaryViolations(
  file,
  content,
  { resolveCompat = createCompatResolver() } = {},
) {
  const normalizedFile = toPosix(file);
  const tree = parseDocumentation(normalizedFile, content);
  const frontmatter = matter(content, {
    engines: { javascript: () => ({}) },
  }).data;
  const components = [...apiComponents(tree)];
  const violations = [];
  let summaryCount = 0;
  const tables = [];

  for (const component of components) {
    const line = component.line ?? 1;
    const result = componentQuery(component, frontmatter.api);
    if (result.error) {
      violations.push({
        file: normalizedFile,
        line,
        component: component.name,
        reason: result.error,
      });
      continue;
    }

    const resolved = resolveCompat(result.query);
    if (resolved.error) {
      violations.push({
        file: normalizedFile,
        line,
        component: component.name,
        query: result.query,
        reason: resolved.error,
      });
      continue;
    }

    if (component.name === 'APISummary') {
      if (!resolved.direct) {
        violations.push({
          file: normalizedFile,
          line,
          component: component.name,
          query: result.query,
          reason: 'target has no direct __compat record',
        });
      } else {
        summaryCount += 1;
      }
    } else {
      if (!resolved.direct) {
        violations.push({
          file: normalizedFile,
          line,
          component: component.name,
          query: result.query,
          reason: 'target has no direct __compat record',
        });
      }
      tables.push({ line, query: result.query });
    }
  }

  if (tables.length > 0 && summaryCount === 0) {
    const table = tables[0];
    violations.push({
      file: normalizedFile,
      line: table.line,
      component: 'APITable',
      query: table.query,
      reason: 'API table page requires an APISummary',
    });
  }

  return violations.sort((left, right) => left.line - right.line);
}

/**
 * Run the CLI scan and report read, parse, query, and compat-shape failures.
 */
function run() {
  if (process.argv.length > 2) {
    console.error(
      'check-api-summary does not accept file arguments; run the full scan without paths',
    );
    process.exitCode = 1;
    return;
  }

  const violations = [];
  const resolveCompat = createCompatResolver();

  for (const file of trackedApiDocuments()) {
    let content;
    try {
      content = readFileSync(path.join(repoRoot, file), 'utf8');
    } catch (error) {
      console.error(`${file}:1: could not read document: ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    try {
      violations.push(
        ...findApiSummaryViolations(file, content, { resolveCompat }),
      );
    } catch (error) {
      const line = error.line ?? error.place?.start?.line ?? 1;
      console.error(
        `${file}:${line}: could not parse document: ${error.message}`,
      );
      process.exitCode = 1;
    }
  }

  if (violations.length === 0) {
    return;
  }

  console.error('API compatibility components must resolve to valid data:');
  for (const violation of violations) {
    const query = violation.query ? ` query="${violation.query}"` : '';
    console.error(
      `  - ${violation.file}:${violation.line}: <${violation.component}>${query}: ${violation.reason}`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === scriptPath) {
  run();
}
