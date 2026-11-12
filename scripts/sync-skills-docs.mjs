// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEBSITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = '@lynx-js/skills-docs';
const SECTIONS = new Map([
  ['agent-lynx', 'ai/agent-lynx'],
  ['skills', 'ai/skills'],
]);
const LYNXJS_LINK = /(\]\(|^\[[^\]]+\]:\s*)https:\/\/lynxjs\.org(\/[^)\s]*)/gm;
const SITE_DOCS = 'docs-own';

/** Merge site-owned entries into package navigation; package pages win during migration. */
function mergeSiteEntries(entries, additions, siteDir) {
  const result = [...entries];
  const names = new Set(result.map((entry) => entry.name));
  for (const item of additions) {
    if (
      (item.type && item.type !== 'file') ||
      typeof item.name !== 'string' ||
      !item.name
    ) {
      throw new Error(
        `Invalid site-owned navigation entry: ${JSON.stringify(item)}`,
      );
    }
    if (names.has(item.name)) continue;
    const { name, before, after, ...entry } = item;
    if (before && after) {
      throw new Error(
        `Site-owned page cannot use both before and after: ${name}`,
      );
    }
    const anchor = before ?? after;
    const index = anchor
      ? result.findIndex((candidate) => candidate.name === anchor)
      : -1;
    if (anchor && index === -1) {
      throw new Error(`Missing site-owned navigation anchor: ${anchor}`);
    }
    if (!existsSync(within(siteDir, name))) {
      throw new Error(`Missing site-owned page: ${name}`);
    }
    const target = { type: 'file', ...entry, name };
    if (anchor) result.splice(before ? index : index + 1, 0, target);
    else result.push(target);
    names.add(name);
  }
  return result;
}

function readSiteEntries(siteDir) {
  const metaFile = join(siteDir, '_meta.json');
  return existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : [];
}

function within(root, name) {
  const target = resolve(root, name);
  if (!name || target === root || !target.startsWith(root + sep)) {
    throw new Error(`Invalid documentation path: ${name}`);
  }
  return target;
}

function packageSource(website) {
  return dirname(
    createRequire(join(website, 'package.json')).resolve(
      `${PACKAGE}/manifest.json`,
    ),
  );
}

function requireIgnored(website, path) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--no-index', path], {
      cwd: website,
    });
  } catch {
    throw new Error(
      `${path} must be ignored by Git; edit the source in ${PACKAGE}.`,
    );
  }
}

function localPageExists(docs, url) {
  const path = url
    .split(/[?#]/)[0]
    .replace(/\.(html|mdx?)$/, '')
    .replace(/\/$/, '');
  const localized = path.startsWith('/zh/') ? path.slice(1) : `en${path}`;
  const base = within(docs, localized);
  return ['.md', '.mdx', '/index.md', '/index.mdx'].some((suffix) =>
    existsSync(base + suffix),
  );
}

/** Mount the package before Rspress discovers routes, just like lynx-stack. */
export function syncSkillsDocs({ website = WEBSITE, source } = {}) {
  website = resolve(website);
  source = resolve(
    source ?? process.env.SKILLS_DOCS_SOURCE ?? packageSource(website),
  );
  const docs = join(website, 'docs');
  const manifest = JSON.parse(
    readFileSync(join(source, 'manifest.json'), 'utf8'),
  );
  if (manifest.schemaVersion !== 1)
    throw new Error('Unsupported skills docs manifest version.');

  const copies = [];
  const navigation = [];
  const sections = new Map();
  const localized = new Map();
  for (const section of manifest.sections) {
    if (SECTIONS.get(section.id) !== section.route)
      throw new Error(`Unsupported section: ${section.route}`);
    if (sections.has(section.id))
      throw new Error(`Duplicate section: ${section.id}`);
    sections.set(section.id, section);
    for (const [locale, content] of Object.entries(section.content)) {
      if (!['en', 'zh'].includes(locale))
        throw new Error(`Unsupported locale: ${locale}`);
      const from = within(source, content);
      const to = within(docs, `${locale}/${section.route}`);
      const siteDir = join(website, SITE_DOCS, locale, section.route);
      const items = JSON.parse(readFileSync(join(from, '_meta.json'), 'utf8'));
      for (const item of items) {
        if (item.type !== 'file' || !existsSync(within(from, item.name))) {
          throw new Error(`Missing sidebar page: ${locale}/${item.name}`);
        }
      }
      const packageNames = new Set(items.map((item) => item.name));
      const siteEntries = readSiteEntries(siteDir);
      const sitePages = siteEntries.filter(
        (item) => !packageNames.has(item.name),
      );
      const mergedItems = mergeSiteEntries(items, siteEntries, siteDir);
      if (!localized.has(locale)) localized.set(locale, new Map());
      localized.get(locale).set(section.id, [
        { type: 'section-header', label: section.label },
        ...mergedItems.map((page) => ({
          ...page,
          name: `${section.route.slice('ai/'.length)}/${page.name}`,
        })),
      ]);
      copies.push({
        from,
        to,
        locale,
        section,
        siteDir,
        sitePages,
        items: mergedItems,
      });
    }
  }
  // Compose each locale once, so adding another section cannot overwrite the
  // previously expanded sidebar or leave one of the package slots unresolved.
  for (const locale of ['en', 'zh']) {
    const entries = localized.get(locale);
    const templateFile = join(docs, locale, 'ai/_meta.template.json');
    const template = JSON.parse(readFileSync(templateFile, 'utf8'));
    for (const id of sections.keys()) {
      if (!entries?.has(id))
        throw new Error(`Missing ${locale} content for section: ${id}`);
      if (template.filter((item) => item.external === id).length !== 1)
        throw new Error(`${templateFile} must mount ${id} exactly once.`);
    }
    const meta = template.flatMap((item) => {
      if (!('external' in item)) return [item];
      if (!entries?.has(item.external))
        throw new Error(`Unknown documentation slot: ${item.external}`);
      return entries.get(item.external);
    });
    navigation.push({ path: join(docs, locale, 'ai/_meta.json'), meta });
  }
  for (const entry of manifest.sharedContent) {
    if (entry.destination !== '_ai')
      throw new Error('Unexpected shared documentation destination.');
    copies.push({
      from: within(source, entry.source),
      to: within(docs, entry.destination),
    });
  }
  for (const entry of manifest.publicAssets) {
    if (![...SECTIONS.values()].includes(entry.destination))
      throw new Error('Unexpected public documentation destination.');
    copies.push({
      from: within(source, entry.source),
      to: within(join(docs, 'public'), entry.destination),
    });
  }
  // Check all inputs and generated destinations before replacing any section.
  for (const { from, to } of copies) {
    if (!existsSync(from)) throw new Error(`Missing package content: ${from}`);
    requireIgnored(website, to + sep);
  }
  for (const { path } of navigation) requireIgnored(website, path);
  for (const { from, to } of copies) {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  }
  for (const { to, siteDir, sitePages } of copies) {
    if (!sitePages?.length) continue;
    for (const page of sitePages) {
      const source = within(siteDir, page.name);
      const target = within(to, page.name);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(source, target);
    }
  }
  for (const { to, locale, section, sitePages, items } of copies) {
    if (!locale) continue;
    const siteNames = new Set((sitePages ?? []).map((page) => page.name));
    for (const name of readdirSync(to, { recursive: true })) {
      if (!/\.mdx?$/.test(name)) continue;
      const file = join(to, name);
      let text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      // Keep the lynx-stack policy: targets absent from this build stay external.
      text = text.replace(LYNXJS_LINK, (match, prefix, url) =>
        localPageExists(docs, url) ? prefix + url : match,
      );
      if (!siteNames.has(name.split(sep).join('/'))) {
        const editUrl = `${manifest.editBaseUrl}/${locale}/${section.route}/${name.split(sep).join('/')}`;
        const editField = `sourceEditUrl: ${JSON.stringify(editUrl)}\n`;
        text = text.startsWith('---\n')
          ? text.replace(/^---\n/, `---\n${editField}`)
          : `---\n${editField}---\n\n${text}`;
      }
      writeFileSync(file, text);
    }
    writeFileSync(
      join(to, '_meta.json'),
      JSON.stringify(items, null, 2) + '\n',
    );
  }
  for (const { path, meta } of navigation)
    writeFileSync(path, JSON.stringify(meta, null, 2) + '\n');
  return {
    source,
    sections: manifest.sections.map((section) => section.route),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const source = args.find((arg) => arg !== '--watch');
  const result = syncSkillsDocs({ source });
  console.log(`Synced ${result.sections.join(', ')} from ${result.source}`);
  if (args.includes('--watch')) {
    let timer;
    watch(result.source, { recursive: true }, (_event, filename) => {
      const name = filename?.toString().split(sep).join('/');
      if (name && name !== 'manifest.json' && !/^(content|public)\//.test(name))
        return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          syncSkillsDocs({ source: result.source });
          console.log(`Updated ${relative(WEBSITE, result.source)}`);
        } catch (error) {
          console.error(error);
        }
      }, 100);
    });
    console.log('Watching skills documentation sources.');
  }
}
