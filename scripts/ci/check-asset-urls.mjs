import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const blockedDomains = new Set(['tosv-sg.tiktok-row.org']);

const textExts = new Set([
  '.cjs',
  '.css',
  '.cts',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.less',
  '.md',
  '.mdx',
  '.mjs',
  '.mts',
  '.scss',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

const ignoreFiles = new Set(['scripts/ci/check-asset-urls.mjs']);

const urlPattern = /https?:\/\/[^\s"'<>)]*/g;

function isBlockedUrl(value) {
  let hostname;
  try {
    hostname = new URL(value).hostname;
  } catch {
    return false;
  }

  hostname = hostname.toLowerCase();
  if (hostname.endsWith('.')) {
    hostname = hostname.slice(0, -1);
  }

  for (const domain of blockedDomains) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return true;
    }
  }

  return false;
}

const args = process.argv.slice(2);
const files =
  args.length > 0
    ? args
    : execFileSync('git', ['ls-files'], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);

const violations = [];

for (const file of files) {
  if (ignoreFiles.has(file)) {
    continue;
  }

  if (!textExts.has(path.extname(file))) {
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(urlPattern)) {
      const url = match[0];
      if (isBlockedUrl(url)) {
        violations.push({ file, line: index + 1, url });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Blocked internal asset URLs detected:');

  for (const violation of violations.slice(0, 200)) {
    console.error(`  - ${violation.file}:${violation.line}: ${violation.url}`);
  }

  if (violations.length > 200) {
    console.error(`... and ${violations.length - 200} more`);
  }

  process.exit(1);
}
