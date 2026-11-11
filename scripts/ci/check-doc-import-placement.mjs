/**
 * Enforce top-of-document static imports in MDX documents.
 *
 * Rules:
 * - Keep static ImportDeclaration statements in the top-level module prelude,
 *   after frontmatter and before document content.
 * - Blank lines and pure MDX comments do not start the body. Leading ESM
 *   declarations may remain in the prelude.
 * - A heading, paragraph, rendered JSX, code block, or other content node
 *   starts the body. Report subsequent executable static imports with their
 *   original file, line, and specifier.
 * - Ignore import-looking prose, inline/fenced examples, and plain .md text.
 *   Dynamic import() expressions keep their existing behavior.
 * - Parse errors fail the check.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDocumentation } from './documentation-parser.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const docExtensions = new Set(['.md', '.mdx']);

/**
 * Normalize native paths across Windows, macOS, and Linux.
 */
function toPosix(value) {
  return value.split(path.sep).join('/');
}

/**
 * Limit checks to Markdown/MDX sources copied into downstream documentation.
 */
function isDocumentationFile(file) {
  return (
    (file.startsWith('docs/') || file.startsWith('sharedDocs/')) &&
    docExtensions.has(path.posix.extname(file))
  );
}

/**
 * Find static imports placed after document content has started.
 */
export function findMisplacedImports(file, content) {
  const normalizedFile = toPosix(file);
  if (!normalizedFile.endsWith('.mdx')) {
    return [];
  }

  const tree = parseDocumentation(normalizedFile, content);
  const violations = [];
  let inBody = false;

  for (const child of tree.children) {
    if (!inBody) {
      if (child.type === 'mdxjsEsm') {
        continue;
      }
      if (child.type === 'mdxFlowExpression') {
        const body = child.data?.estree?.body ?? [];
        if (body.length === 0) {
          continue;
        }
      }
      inBody = true;
    }

    if (inBody && child.type === 'mdxjsEsm') {
      const estree = child.data?.estree;
      if (estree?.body) {
        for (const stmt of estree.body) {
          if (stmt.type === 'ImportDeclaration') {
            violations.push({
              file: normalizedFile,
              line: stmt.loc?.start?.line ?? child.position?.start?.line ?? 1,
              specifier: stmt.source?.value ?? '',
            });
          }
        }
      }
    }
  }

  return violations.sort((a, b) => a.line - b.line);
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
      violations.push(...findMisplacedImports(file, content));
    } catch (error) {
      const line =
        error.line ?? error.place?.start?.line ?? (error.mark?.line ?? 0) + 1;
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
    'Documentation static imports must be placed in the module prelude before document content.',
  );
  console.error(
    'Move these static imports to the top of the file after frontmatter:',
  );
  for (const violation of violations) {
    console.error(
      `  - ${violation.file}:${violation.line}: static import from '${violation.specifier}'`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  run();
}
