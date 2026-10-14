// Synchronize the API reference sections that lynx-stack owns into this site.
//
// The source manifest is the authority for which generated sections exist,
// where each locale's content lives, and which package pages appear in the
// sidebar. By default the source is the installed @lynx-js/lynx-stack-docs
// package; an explicit source may point at the docs/ directory of a built
// lynx-stack checkout.
//
// The sync:
// 1. verifies that the site's top-level API sidebar declares every section;
// 2. replaces each generated section with its manifest-declared content;
// 3. rebuilds the package sidebar from manifest.shownPackages;
// 4. verifies that generated directories are ignored by Git; and
// 5. makes lynxjs.org links site-relative only when the target exists locally.
//
// Generated sections are replaced wholesale, so change their sources in
// lynx-stack rather than editing the copied pages here. Theme-owned route
// classification and site-owned API overlays are separate concerns; the
// sync:lynx-stack-docs package script applies overlays after this script.
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

const WEBSITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(WEBSITE, 'docs');
const LYNXJS_LINK = /(\]\(|^\[[^\]]+\]:\s*)https:\/\/lynxjs\.org(\/[^)\s]*)/gm;

/** Resolve the default source relative to this installed lynx-doc package. */
function packageSource() {
  const require = createRequire(import.meta.url);
  return dirname(require.resolve('@lynx-js/lynx-stack-docs/manifest.json'));
}

/**
 * Whether a lynxjs.org path resolves to a page published by this site.
 * Unprefixed links target English; /zh/ links retain their locale.
 */
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

/** List Markdown pages under one generated section. */
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

// Top-level API navigation is site-owned. Require it to acknowledge every
// generated section before copying, so an upstream addition or rename cannot
// silently produce pages with no sidebar entry.
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

// Section directories are generated output. Replace them instead of merging so
// pages removed upstream do not survive locally as stale routes.
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

// Every package keeps its copied page so existing links remain valid, but the
// sidebar lists only manifest.shownPackages, preserving its order and groups.
// A single group needs no header because the enclosing section already names it.
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

// Generated sections must stay out of version control. Within those sections,
// localize only lynxjs.org links whose target is actually present in this site;
// leave all other absolute links intact instead of creating broken local URLs.
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
