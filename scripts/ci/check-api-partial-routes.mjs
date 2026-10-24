import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const buildRoot = path.join(repoRoot, 'doc_build');
const routeReference =
  /(?:^|[/])(?:(?:en|zh)[/])?api[/]elements[/]built-in[/][^/?#"'`\\\s]+-API(?:\.(?:html|mdx))?(?=$|[/?#"'`\\\s])/;
const routeFile =
  /^(?:(?:en|zh)\/)?api\/elements\/built-in\/[^/]+-API(?:\.html|\/index\.html)?$/;
const searchableExtensions = new Set(['.html', '.json', '.txt', '.xml']);

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const files = await listFiles(buildRoot);
  const violations = [];

  for (const file of files) {
    const relativePath = path
      .relative(buildRoot, file)
      .split(path.sep)
      .join('/');
    if (routeFile.test(relativePath)) {
      violations.push(`${relativePath}: generated standalone route`);
      continue;
    }

    if (!searchableExtensions.has(path.extname(file).toLowerCase())) {
      continue;
    }

    if (routeReference.test(await readFile(file, 'utf8'))) {
      violations.push(
        `${relativePath}: generated output references an API-only route`,
      );
    }
  }

  if (violations.length > 0) {
    console.error(
      [
        'API-only built-in partial routes must not be generated or indexed:',
        ...violations,
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  console.log('No API-only built-in partial routes were generated or indexed.');
}

await main();
