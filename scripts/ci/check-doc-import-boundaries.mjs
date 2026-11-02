import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';

// Keep the existing plain-node CLI usable by lint-staged and CI. Loading only
// Gate 3's documentation adapter does not initialize the site's resolvers.
const { findDocumentationBoundaryImports } = await tsImport(
  '../alias-contracts/boundary.ts',
  import.meta.url,
);

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const docExtensions = new Set(['.md', '.mdx']);

/**
 * Normalize native paths across Windows, macOS, and Linux. Windows uses `\`
 * separators, while Git paths and the POSIX helpers below use `/`.
 */
function toPosix(value) {
  return value.split(path.sep).join('/');
}

/**
 * Preserve the documentation entry's diagnostic shape while delegating parsing,
 * relative boundaries and source-derived suggestions to Gate 3.
 */
export function findSourceBoundaryImports(file, content) {
  return findDocumentationBoundaryImports(repoRoot, file, content);
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
