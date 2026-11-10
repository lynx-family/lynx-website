import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from 'eslint-scope';

import {
  compileDocumentation,
  parseDocumentation,
} from './documentation-parser.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);

// Derive generated API routes from the same manifest used by the sync script
// instead of maintaining a second list that can drift from the package.
const lynxStackManifest = JSON.parse(
  readFileSync(
    require.resolve('@lynx-js/lynx-stack-docs/manifest.json'),
    'utf8',
  ),
);
const separatelyManagedDocumentationPrefixes = [
  'docs/en/lynxtron/',
  'docs/zh/lynxtron/',
  'sharedDocs/introDocs/',
  'sharedDocs/packageDocs/',
  ...lynxStackManifest.sections.flatMap(({ route, content }) =>
    Object.keys(content).map((locale) => `docs/${locale}/${route}/`),
  ),
];

/**
 * Generated ESTree nodes lack source ranges. Give every node a nested range
 * so eslint-scope can distinguish parameter and body scopes. Diagnostics use
 * original MDX locations instead of these analysis-only offsets.
 */
function addScopeRanges(tree) {
  let offset = 0;
  /** Assign depth-first ranges so every parent encloses its descendants. */
  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (
      value &&
      typeof value === 'object' &&
      typeof value.type === 'string'
    ) {
      const start = offset++;
      for (const [key, child] of Object.entries(value)) {
        if (!['loc', 'position', 'range'].includes(key)) {
          visit(child);
        }
      }
      value.range = [start, offset++];
    }
  }
  visit(tree);
}

/**
 * Only executable MDX imports create bindings. Compiling JSX into ordinary
 * ESTree expressions lets eslint-scope handle namespace components, exports,
 * shorthand properties and shadowing with its standard lexical scope rules.
 * Neither MDX nor imported modules are executed.
 */
export function findUnusedDocumentationImports(file, content) {
  if (path.extname(file) !== '.mdx') {
    return [];
  }
  const tree = parseDocumentation(file, content);
  const bindings = [];
  for (const node of tree.children) {
    if (node.type !== 'mdxjsEsm') {
      continue;
    }
    for (const statement of node.data.estree.body) {
      if (statement.type === 'ImportDeclaration') {
        for (const specifier of statement.specifiers) {
          // Unaliased named imports share their imported/local identifier node.
          // MDX can offset that shared node twice; the specifier stays accurate.
          const location =
            specifier.local === specifier.imported
              ? specifier.loc.start
              : specifier.local.loc.start;
          bindings.push({
            file,
            line: location.line,
            column: location.column + 1,
            name: specifier.local.name,
            source: statement.source.value,
          });
        }
      }
    }
  }
  if (bindings.length === 0) {
    return [];
  }

  const module = compileDocumentation(file, content);
  addScopeRanges(module);
  const scopes = analyze(module, {
    ecmaVersion: 2024,
    sourceType: 'module',
    optimistic: true,
    ignoreEval: true,
  });
  const moduleScope = scopes.scopes.find((scope) => scope.type === 'module');
  return bindings.filter((binding) => {
    const variable = moduleScope.variables.find(
      (variable) =>
        variable.name === binding.name &&
        variable.defs.some(
          (definition) =>
            definition.type === 'ImportBinding' &&
            definition.parent.source.value === binding.source,
        ),
    );
    if (!variable) {
      throw new Error(`Could not analyze import '${binding.name}'`);
    }
    return !variable.references.some((reference) => reference.isRead());
  });
}

/** Whether a repository-relative path belongs to this site's MDX audit. */
export function isAuditedDocumentationFile(file) {
  return (
    (file.startsWith('docs/') || file.startsWith('sharedDocs/')) &&
    path.posix.extname(file) === '.mdx' &&
    !separatelyManagedDocumentationPrefixes.some((prefix) =>
      file.startsWith(prefix),
    )
  );
}

/** Select tracked docs by default, or normalize explicit CLI paths. */
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
      path
        .relative(
          repoRoot,
          path.isAbsolute(file) ? file : path.resolve(process.cwd(), file),
        )
        .split(path.sep)
        .join('/'),
    )
    .filter((file) => !file.startsWith('../'));
}

/** Run the audit CLI and report failures through `process.exitCode`. */
function run() {
  const args = process.argv.slice(2);
  const unknownOption = args.find((argument) => argument.startsWith('--'));
  if (unknownOption) {
    console.error(`Unknown option '${unknownOption}'.`);
    process.exitCode = 1;
    return;
  }
  let checked = 0;
  for (const file of filesToCheck(args)) {
    if (!isAuditedDocumentationFile(file)) {
      continue;
    }
    let content;
    try {
      content = readFileSync(path.join(repoRoot, file), 'utf8');
    } catch (error) {
      // lint-staged can pass a tracked path that was deleted in the worktree.
      if (error.code === 'ENOENT') {
        continue;
      }
      console.error(`${file}: could not read document: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    try {
      for (const binding of findUnusedDocumentationImports(file, content)) {
        console.error(
          `${file}:${binding.line}:${binding.column}: unused import '${binding.name}' from '${binding.source}'`,
        );
        process.exitCode = 1;
      }
      checked++;
    } catch (error) {
      const line = error.line ?? error.place?.start?.line ?? 1;
      console.error(
        `${file}:${line}: could not analyze document: ${error.message}`,
      );
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) {
    console.log(`Checked ${checked} MDX documents for unused imports.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  run();
}
