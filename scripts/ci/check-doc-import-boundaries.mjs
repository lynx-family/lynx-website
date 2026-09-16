import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProcessor } from '@mdx-js/mdx';
import matter from 'gray-matter';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkCjkStrikethrough from 'remark-cjk-friendly-gfm-strikethrough';
import remarkGfm from 'remark-gfm';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const docExtensions = new Set(['.md', '.mdx']);

// Match Rspress's syntax plugins and extension-based format selection, without
// running its rendering plugins, importing site config, or executing documents.
// Keep these direct dependency versions aligned with @rspress/core.
const processors = new Map(
  ['md', 'mdx'].map((format) => [
    format,
    createProcessor({
      format,
      remarkPlugins: [remarkGfm, remarkCjkFriendly, remarkCjkStrikethrough],
    }),
  ]),
);

/**
 * Normalize native paths across Windows, macOS, and Linux. Windows uses `\`
 * separators, while Git paths and the POSIX helpers below use `/`.
 */
function toPosix(value) {
  return value.split(path.sep).join('/');
}

/**
 * Match Rspress's frontmatter removal and heading-ID escaping before parsing.
 * Restore removed line breaks so AST locations still refer to the source file.
 * The site's version-placeholder remark plugin runs after parsing and rewrites
 * only code nodes, so it is intentionally irrelevant to import discovery.
 */
function prepareSource(content) {
  // Only metadata boundaries matter here. Never evaluate gray-matter's
  // JavaScript frontmatter engine while inspecting a document.
  const body = matter(content, { engines: { javascript: () => ({}) } }).content;
  const removedLines = content.split('\n').length - body.split('\n').length;
  return `${'\n'.repeat(removedLines)}${body}`.replace(
    /(?:^|\n)#{1,6}(?!#).*/g,
    (heading) => heading.replace('{#', '\\{#').replace('\\\\{#', '\\{#'),
  );
}

/**
 * Walk Markdown nodes and their embedded ESTree, including JSX attributes and
 * template substitutions. Yield statically known import sources, including
 * dynamic imports using template literals without substitutions. Only typed
 * AST children are visited, not locations, comments, or arbitrary metadata.
 * The parser decides what is executable.
 */
function* importNodes(node) {
  if (
    node.type === 'ImportDeclaration' ||
    node.type === 'ExportNamedDeclaration' ||
    node.type === 'ExportAllDeclaration' ||
    node.type === 'ImportExpression'
  ) {
    let specifier;
    if (node.source?.type === 'Literal') {
      specifier = node.source.value;
    } else if (
      node.type === 'ImportExpression' &&
      node.source?.type === 'TemplateLiteral' &&
      node.source.expressions.length === 0
    ) {
      specifier = node.source.quasis[0]?.value.cooked;
    }
    if (typeof specifier === 'string') {
      yield { node, specifier };
    }
  }

  if (node.data?.estree) {
    yield* importNodes(node.data.estree);
  }
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string'
      ) {
        yield* importNodes(child);
      }
    }
  }
}

/**
 * Suggest only documented component aliases. Preserve resource extensions and
 * query/hash modifiers; unknown source roots remain violations without a guess.
 */
function suggestedAlias(target, modifier) {
  const aliasRoots = [
    ['src/components', '@lynx'],
    ['src/lynx-ui/components', '@lynx-ui'],
  ];
  for (const [sourceRoot, alias] of aliasRoots) {
    if (target !== sourceRoot && !target.startsWith(`${sourceRoot}/`)) {
      continue;
    }
    const subpath = (
      target === sourceRoot ? '' : target.slice(sourceRoot.length + 1)
    )
      .replace(/\.(?:[cm]?[jt]s|[jt]sx)$/, '')
      .replace(/(^|\/)index$/, '');
    return `${alias}${subpath ? `/${subpath}` : ''}${modifier}`;
  }
  return undefined;
}

/**
 * Find imports violating the OSS/downstream source boundary.
 *
 * Rules:
 * - Use Rspress-aligned Markdown/MDX parsing, not text matching.
 * - Check static imports, re-exports, and statically known dynamic imports.
 * - Ignore examples, prose, comments, and strings, but visit JS expressions.
 * - Reject relative sources resolving into src/ or theme/; do not migrate aliases.
 * - Preserve query/hash modifiers and original one-based diagnostic lines.
 * - Suggest documented aliases without JS/TS extensions or a final index.
 * - Fail on parse errors; an unparsed document must not silently pass.
 *
 * Plain .md uses Markdown semantics, so import-looking text is not executable.
 * Computed dynamic sources are not evaluated or checked.
 */
export function findSourceBoundaryImports(file, content) {
  const normalizedFile = toPosix(file);
  const format = path.posix.extname(normalizedFile).slice(1);
  const tree = processors.get(format).parse({
    path: normalizedFile,
    value: prepareSource(content),
  });
  const violations = [];
  for (const { node, specifier } of importNodes(tree)) {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
      continue;
    }
    const modifierIndex = specifier.search(/[?#]/);
    const cleanSpecifier =
      modifierIndex === -1 ? specifier : specifier.slice(0, modifierIndex);
    const modifier = modifierIndex === -1 ? '' : specifier.slice(modifierIndex);
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(normalizedFile), cleanSpecifier),
    );
    const crossesRuntimeBoundary = ['src', 'theme'].some(
      (root) => target === root || target.startsWith(`${root}/`),
    );
    if (!crossesRuntimeBoundary) {
      continue;
    }
    violations.push({
      file: normalizedFile,
      line: node.loc.start.line,
      specifier,
      target,
      suggestion: suggestedAlias(target, modifier),
    });
  }
  return violations.sort((a, b) => a.line - b.line);
}

/**
 * Limit checks to Markdown sources copied into downstream documentation.
 */
function isDocumentationFile(file) {
  return (
    (file.startsWith('docs/') || file.startsWith('sharedDocs/')) &&
    docExtensions.has(path.posix.extname(file))
  );
}

/**
 * Scan tracked documents without arguments, or normalize explicit file paths
 * from lint-staged. NUL delimiters preserve spaces and non-ASCII Git filenames.
 */
function filesToCheck(args) {
  if (args.length === 0) {
    return execFileSync('git', ['ls-files', '-z', 'docs', 'sharedDocs'], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
  }
  return args
    .map((file) =>
      toPosix(
        path.relative(
          repoRoot,
          path.isAbsolute(file) ? file : path.resolve(process.cwd(), file),
        ),
      ),
    )
    .filter((file) => !file.startsWith('../'));
}

/**
 * Report all violations and parse/read failures, returning a nonzero exit code
 * for either. Missing tracked files may be staged deletions and are skipped.
 */
function run() {
  const violations = [];
  for (const file of filesToCheck(process.argv.slice(2))) {
    if (!isDocumentationFile(file)) {
      continue;
    }
    let content;
    try {
      content = readFileSync(path.join(repoRoot, file), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      console.error(`${file}: could not read document: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    try {
      violations.push(...findSourceBoundaryImports(file, content));
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
  console.error(
    'Documentation imports must not cross into src/ or theme/ through relative paths.',
  );
  console.error(
    'Use a resolver alias shared by the OSS and downstream builds instead:',
  );
  for (const violation of violations) {
    const replacement = violation.suggestion
      ? `; use '${violation.suggestion}'`
      : '';
    console.error(
      `  - ${violation.file}:${violation.line}: '${violation.specifier}' resolves to '${violation.target}'${replacement}`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  run();
}
