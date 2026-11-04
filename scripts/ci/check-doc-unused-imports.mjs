import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from 'eslint-scope';

import {
  compileDocumentation,
  parseDocumentation,
} from './documentation-parser.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);

/**
 * Generated ESTree nodes lack source ranges. Give every node a nested range
 * so eslint-scope can distinguish parameter and body scopes. Diagnostics use
 * original MDX locations instead of these analysis-only offsets.
 */
function addScopeRanges(tree) {
  let offset = 0;
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

/**
 * Compare bindings rather than line numbers so unrelated prose changes do not
 * reintroduce historical debt. New files, import sources and newly unused
 * bindings must pass; deleting an old occurrence needs no baseline update.
 */
export function findNewUnusedImports(current, previous) {
  const key = ({ file, name, source }) => JSON.stringify([file, name, source]);
  const existing = new Set(previous.map(key));
  return current.filter((binding) => !existing.has(key(binding)));
}

function isDocumentationFile(file) {
  return (
    (file.startsWith('docs/') || file.startsWith('sharedDocs/')) &&
    path.posix.extname(file) === '.mdx'
  );
}

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

function run() {
  const args = process.argv.slice(2);
  let base;
  const files = [];
  try {
    for (let index = 0; index < args.length; index++) {
      const argument = args[index];
      if (argument === '--base') {
        if (base || !args[index + 1] || args[index + 1].startsWith('--')) {
          throw new Error('Use --base <commit> at most once.');
        }
        base = execFileSync(
          'git',
          [
            'rev-parse',
            '--verify',
            '--end-of-options',
            `${args[++index]}^{commit}`,
          ],
          {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        ).trim();
      } else if (argument.startsWith('--')) {
        throw new Error(`Unknown option '${argument}'.`);
      } else {
        files.push(argument);
      }
    }
  } catch (error) {
    console.error(`Could not select documentation baseline: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const baseFiles = base
    ? new Set(
        execFileSync(
          'git',
          [
            'ls-tree',
            '-r',
            '--name-only',
            '-z',
            base,
            '--',
            'docs',
            'sharedDocs',
          ],
          {
            cwd: repoRoot,
            encoding: 'utf8',
          },
        ).split('\0'),
      )
    : new Set();
  let checked = 0;
  let existing = 0;
  for (const file of filesToCheck(files)) {
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
      const current = findUnusedDocumentationImports(file, content);
      const previous =
        current.length && baseFiles.has(file)
          ? findUnusedDocumentationImports(
              file,
              execFileSync('git', ['show', `${base}:${file}`], {
                cwd: repoRoot,
                encoding: 'utf8',
                maxBuffer: 8 * 1024 * 1024,
              }),
            )
          : [];
      const violations = findNewUnusedImports(current, previous);
      existing += current.length - violations.length;
      for (const binding of violations) {
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
  if (base) {
    console.log(
      `${existing} existing unused imports compared with ${base}; run without --base for the full audit.`,
    );
  }
  if (!process.exitCode) {
    console.log(`Checked ${checked} MDX documents for unused imports.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  run();
}
