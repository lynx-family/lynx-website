// Copy the API reference pages that lynx-stack owns into this site.
//
// manifest.json of the source says what it contains: the installed
// @lynx-js/lynx-stack-docs package by default, or the docs/ directory of a
// lynx-stack checkout. Change those pages in lynx-stack, not here; the next
// sync overwrites local edits. Links to lynxjs.org pages that exist in this
// site become site-relative.
//
// Usage: node scripts/sync-lynx-stack-docs.mjs [source]

import { execFileSync } from 'node:child_process';
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

import { GROUP_SUBSITES } from '../shared-subsite-routes.ts';

const WEBSITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(WEBSITE, 'docs');
const LYNXJS_LINK = /(\]\(|^\[[^\]]+\]:\s*)https:\/\/lynxjs\.org(\/[^)\s]*)/gm;

function packageSource() {
  const require = createRequire(import.meta.url);
  return dirname(require.resolve('@lynx-js/lynx-stack-docs/manifest.json'));
}

function pageExists(url) {
  let path = url
    .split('#')[0]
    .replace(/\.(html|mdx?)$/, '')
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
const manifestFile = join(source, 'manifest.json');
if (!existsSync(manifestFile)) {
  throw new Error(
    `${manifestFile} does not exist. Pass the docs/ directory of a built lynx-stack checkout, or install @lynx-js/lynx-stack-docs.`,
  );
}
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));

// The sections are generated, listed in the sidebar and left out of git. Each
// of those is stated by hand here, so a section the manifest adds or renames
// stops the sync instead of quietly landing in a tracked directory or in no
// sidebar at all.
const LOCALES = [
  ...new Set(manifest.sections.flatMap((s) => Object.keys(s.content))),
];
for (const locale of LOCALES) {
  const meta = JSON.parse(
    readFileSync(join(DOCS, locale, 'api/_meta.json'), 'utf8'),
  );
  const listed = new Set(meta.map((item) => item.name));
  for (const { route } of manifest.sections) {
    const name = route.replace(/^api\//, '');
    if (!listed.has(name)) {
      throw new Error(
        `docs/${locale}/api/_meta.json does not list ${name}; the pages would sync without a sidebar entry.`,
      );
    }
  }
}

const synced = [];
for (const section of manifest.sections) {
  for (const [locale, content] of Object.entries(section.content)) {
    const to = join(DOCS, locale, section.route);
    rmSync(to, { recursive: true, force: true });
    cpSync(join(source, content), to, { recursive: true });
    synced.push(to);
    console.log(`synced ${locale}/${section.route}`);
  }
}

// Every package keeps its page, so links to it stay valid, but the sidebar
// lists only the packages the manifest names, in its order and groups. A
// single group is the section itself, so its header would repeat the name.
// The theme reads the same group names to pick a subsite for a package page.
const groups = new Set(manifest.shownPackages.map(({ group }) => group));
for (const group of Object.keys(GROUP_SUBSITES)) {
  if (!groups.has(group)) {
    throw new Error(
      `shared-subsite-routes.ts maps the group ${group}, which the manifest no longer has.`,
    );
  }
}

const metaFile = (locale) => join(DOCS, locale, 'api/packages/_meta.json');
for (const locale of LOCALES) {
  const items = new Map(
    JSON.parse(readFileSync(metaFile(locale), 'utf8'))
      .filter((item) => item.label)
      .map((item) => [item.label, item]),
  );
  const meta = [];
  for (const { group, packages } of manifest.shownPackages) {
    if (manifest.shownPackages.length > 1) {
      meta.push({ type: 'section-header', label: group });
    }
    for (const name of packages) {
      if (!items.has(name)) {
        throw new Error(`${name} of the manifest has no page`);
      }
      meta.push(items.get(name));
    }
  }
  writeFileSync(metaFile(locale), `${JSON.stringify(meta, null, 2)}\n`);
}

for (const dir of synced) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', dir], { cwd: WEBSITE });
  } catch {
    throw new Error(
      `${dir} is not ignored by git; generated pages must not be committed.`,
    );
  }
  for (const file of markdownFiles(dir)) {
    const text = readFileSync(file, 'utf8');
    const localized = text.replace(LYNXJS_LINK, (match, prefix, path) =>
      pageExists(path) ? prefix + path : match,
    );
    if (localized !== text) writeFileSync(file, localized);
  }
}
