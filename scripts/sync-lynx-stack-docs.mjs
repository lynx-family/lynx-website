// Copy the API reference pages that lynx-stack owns into this site.
//
// The source is a directory with content/{en,zh}/<dir> for each directory in
// scripts/lynx-stack-docs-dirs.txt: the installed @lynx-js/lynx-stack-docs
// package by default, or the docs/ directory of a lynx-stack checkout. Change
// those pages in lynx-stack, not here; the next sync overwrites local edits.
// Links to lynxjs.org pages that exist in this site become site-relative.
//
// Usage: node scripts/sync-lynx-stack-docs.mjs [source]

import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEBSITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(WEBSITE, 'docs');
const LOCALES = ['en', 'zh'];
const LYNXJS_LINK = /(\]\(|^\[[^\]]+\]:\s*)https:\/\/lynxjs\.org(\/[^)\s]*)/gm;

function packageSource() {
  const require = createRequire(import.meta.url);
  return dirname(require.resolve('@lynx-js/lynx-stack-docs/package.json'));
}

function pageExists(url) {
  let path = url
    .split('#')[0]
    .replace(/\.html$/, '')
    .replace(/\/$/, '');
  if (!path.startsWith('/zh/')) path = `/en${path}`;
  const base = join(DOCS, path.slice(1));
  return ['.md', '.mdx', '/index.md', '/index.mdx'].some((ext) =>
    existsSync(base + ext),
  );
}

function markdownFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .map((name) => join(dir, name))
    .filter((file) => /\.mdx?$/.test(file) && statSync(file).isFile());
}

const source = resolve(process.argv[2] ?? packageSource());
const dirs = readFileSync(
  join(WEBSITE, 'scripts/lynx-stack-docs-dirs.txt'),
  'utf8',
)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const synced = [];
for (const dir of dirs) {
  for (const locale of LOCALES) {
    const from = join(source, 'content', locale, dir);
    if (!existsSync(from)) {
      throw new Error(
        `${from} does not exist. Pass the docs/ directory of a lynx-stack checkout, or install @lynx-js/lynx-stack-docs.`,
      );
    }
    const to = join(DOCS, locale, dir);
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
    synced.push(to);
    console.log(`synced ${locale}/${dir}`);
  }
}

for (const dir of synced) {
  for (const file of markdownFiles(dir)) {
    const text = readFileSync(file, 'utf8');
    const localized = text.replace(LYNXJS_LINK, (match, prefix, path) =>
      pageExists(path) ? prefix + path : match,
    );
    if (localized !== text) writeFileSync(file, localized);
  }
}
