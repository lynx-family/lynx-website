// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const LOCALES = ['en', 'zh'];
const ROUTES = new Map([
  ['agent-lynx', 'ai/agent-lynx'],
  ['skills', 'ai/skills'],
]);
const INVENTORY = '.skills-docs.json';
const require = createRequire(import.meta.url);
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function within(root, name) {
  if (
    typeof name !== 'string' ||
    !name ||
    name.includes('\\') ||
    name.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`Invalid documentation path: ${name}`);
  }
  const target = resolve(root, name);
  if (!target.startsWith(resolve(root) + sep)) {
    throw new Error(`Invalid documentation path: ${name}`);
  }
  return target;
}

function files(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) {
      throw new Error(`Documentation symlink: ${join(root, entry.name)}`);
    }
    return entry.isDirectory()
      ? files(join(root, entry.name)).map((name) => `${entry.name}/${name}`)
      : [entry.name];
  });
}

const pageRoute = (name) => name.replace(/\.mdx?$/, '').replace(/\/index$/, '');

function validateNavigation(
  directory,
  entries = json(join(directory, '_meta.json')),
) {
  const names = new Set();
  for (const item of entries) {
    if (['divider', 'section-header', 'custom-link'].includes(item.type))
      continue;
    const name = typeof item === 'string' ? item : item.name;
    const base = within(directory, name);
    const target = [base, `${base}.md`, `${base}.mdx`].find(existsSync);
    if (names.has(name) || !target) {
      throw new Error(`Missing or duplicate sidebar page: ${name}`);
    }
    names.add(name);
    if (statSync(target).isDirectory()) {
      validateNavigation(target);
    }
  }
  return entries;
}

function websiteNavigation(directory, base, generated = false) {
  const script = join(directory, '_meta.js');
  if (existsSync(script)) {
    delete require.cache[require.resolve(script)];
    const transform = require(script);
    return (transform.default ?? transform)(base);
  }
  const file = join(directory, '_meta.json');
  return !generated && existsSync(file) ? json(file) : base;
}

function editUrl(text) {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const field = frontmatter?.match(/^sourceEditUrl:\s*([^\r\n]+)/m)?.[1];
  return field?.replace(/^["']|["']$/g, '');
}

function withEditUrl(text, url) {
  text = text.replace(/\r\n/g, '\n');
  const field = `sourceEditUrl: ${JSON.stringify(url)}\n`;
  if (!text.startsWith('---\n')) return `---\n${field}---\n\n${text}`;
  return text.replace(
    /^---\n([\s\S]*?)\n---/,
    (_, frontmatter) =>
      `---\n${field}${frontmatter.replace(/^sourceEditUrl:.*\n?/gm, '')}\n---`,
  );
}

/**
 * Mount a complete producer tree. agent-lynx is replaced as a unit; Skills is
 * the disjoint union of producer files and website files. The inventory
 * is an output ledger for cleanup and provenance adapters, not an authoring root.
 */
export function mountSkillsDocs({
  website,
  mounts,
  provenance = {},
  legacyEditBases = [],
}) {
  const docs = join(resolve(website), 'docs');
  const inventoryPath = join(docs, INVENTORY);
  const previous = existsSync(inventoryPath)
    ? json(inventoryPath)
    : { schemaVersion: 1, packageFiles: {} };
  if (previous.schemaVersion !== 1) {
    throw new Error('Unsupported website documentation inventory');
  }
  for (const file of Object.keys(previous.packageFiles ?? {})) {
    within(docs, file);
  }
  const planned = new Map();
  const packageFiles = {};
  const websiteFiles = {};
  const navigation = new Map();
  const removals = new Set();
  const managedRoots = new Set();
  for (const { from, to } of mounts) {
    within(docs, to);
    if (
      !/^(?:(?:en|zh)\/ai\/(?:agent-lynx|skills)|_ai|public\/ai\/(?:agent-lynx|skills))$/.test(
        to,
      ) ||
      managedRoots.has(to)
    ) {
      throw new Error(`Invalid or duplicate documentation mount: ${to}`);
    }
    managedRoots.add(to);
    if (!existsSync(from)) throw new Error(`Missing package content: ${from}`);
    const names = files(from);
    const packageRoutes = names
      .filter((name) => /\.mdx?$/.test(name))
      .map(pageRoute);
    if (new Set(packageRoutes).size !== packageRoutes.length) {
      throw new Error(`Duplicate package page route: ${to}`);
    }
    for (const name of names) {
      const relative = `${to}/${name}`;
      planned.set(relative, readFileSync(join(from, name)));
      packageFiles[relative] = provenance[relative] ?? null;
    }
    const section = to.match(/^(en|zh)\/ai\/(agent-lynx|skills)$/);
    if (!section) continue;
    const [, locale, id] = section;
    const entries = validateNavigation(from);
    const target = within(docs, to);
    if (id === 'agent-lynx') {
      navigation.set(`${locale}/${id}`, entries);
      continue;
    }
    const routes = new Set(
      names.filter((name) => /\.mdx?$/.test(name)).map(pageRoute),
    );
    for (const name of files(target)) {
      if (name === '_meta.js' || name === '_meta.json') continue;
      const relative = `${to}/${name}`;
      const oldUrl = /\.mdx?$/.test(name)
        ? editUrl(readFileSync(join(target, name), 'utf8'))
        : undefined;
      // An explicit website edit URL also permits a transfer from old package output.
      const wasPackageOwned = oldUrl
        ? legacyEditBases.some((base) => oldUrl.startsWith(base + '/'))
        : Object.hasOwn(previous.packageFiles ?? {}, relative);
      if (wasPackageOwned) {
        if (!names.includes(name)) removals.add(relative);
        continue;
      }
      if (
        names.includes(name) ||
        (/\.mdx?$/.test(name) && routes.has(pageRoute(name)))
      ) {
        throw new Error(`Duplicate documentation ownership: ${relative}`);
      }
      if (/\.mdx?$/.test(name)) routes.add(pageRoute(name));
      planned.set(relative, readFileSync(join(target, name)));
      websiteFiles[relative] = oldUrl ?? null;
    }
    const metaFile = `${to}/_meta.json`;
    const generated = Object.hasOwn(previous.packageFiles ?? {}, metaFile);
    const authoredJson =
      !existsSync(join(target, '_meta.js')) &&
      !generated &&
      existsSync(join(target, '_meta.json'));
    const merged = websiteNavigation(target, entries, generated);
    if (authoredJson) {
      delete packageFiles[metaFile];
      websiteFiles[metaFile] = null;
    }
    planned.set(
      `${to}/_meta.json`,
      Buffer.from(`${JSON.stringify(merged, null, 2)}\n`),
    );
    navigation.set(`${locale}/${id}`, merged);
  }
  // A retired asset mount is still package-owned. Clean only its recorded files.
  for (const file of Object.keys(previous.packageFiles ?? {})) {
    if (!planned.has(file) && /^(?:_ai\/|public\/ai\/)/.test(file)) {
      removals.add(file);
    }
  }
  for (const locale of LOCALES) {
    const base = [];
    for (const id of ROUTES.keys()) {
      if (!navigation.has(`${locale}/${id}`)) {
        throw new Error(`Missing ${locale} content: ${id}`);
      }
      base.push(
        {
          type: 'section-header',
          label: id === 'skills' ? 'Skills' : 'agent-lynx',
        },
        ...navigation.get(`${locale}/${id}`).map((page) => {
          if (typeof page === 'string') return `${id}/${page}`;
          return page.name ? { ...page, name: `${id}/${page.name}` } : page;
        }),
      );
    }
    const entries = websiteNavigation(join(docs, locale, 'ai'), base);
    planned.set(
      `${locale}/ai/_meta.json`,
      Buffer.from(`${JSON.stringify(entries, null, 2)}\n`),
    );
  }
  // Metadata controls visibility only. Validate against all final files, including hidden pages.
  for (const [file, content] of planned) {
    if (!/^(en|zh)\/ai\/(?:skills\/)?_meta.json$/.test(file)) continue;
    const directory = dirname(file);
    const seen = new Set();
    for (const item of JSON.parse(content)) {
      if (['divider', 'section-header', 'custom-link'].includes(item.type))
        continue;
      const name = typeof item === 'string' ? item : item.name;
      within(docs, `${directory}/${name}`);
      const route = pageRoute(name);
      if (seen.has(route)) throw new Error(`Duplicate sidebar page: ${name}`);
      seen.add(route);
      const found = ['', '.md', '.mdx', '/_meta.json'].some((suffix) => {
        const path = `${directory}/${name}${suffix}`;
        if (planned.has(path)) return true;
        if (
          removals.has(path) ||
          [...managedRoots].some((root) => path.startsWith(root + '/'))
        )
          return false;
        return existsSync(within(docs, path));
      });
      if (!found) throw new Error(`Missing sidebar page: ${name}`);
    }
  }
  // Resolve links against the final tree, not a stale page about to be removed.
  const localExists = (url) => {
    const route = url
      .split(/[?#]/)[0]
      .replace(/\.(?:html|mdx?)$/, '')
      .replace(/\/$/, '');
    const relative = route.startsWith('/zh/') ? route.slice(1) : `en${route}`;
    return ['.md', '.mdx', '/index.md', '/index.mdx'].some((suffix) => {
      const file = relative + suffix;
      if (planned.has(file)) return true;
      if ([...managedRoots].some((root) => file.startsWith(root + '/'))) {
        return false;
      }
      return existsSync(within(docs, file));
    });
  };
  for (const file of Object.keys(packageFiles).filter((name) =>
    /\.mdx?$/.test(name),
  )) {
    const content = planned
      .get(file)
      .toString()
      .replace(
        /(\]\(|^\[[^\]]+\]:\s*)https:\/\/lynxjs\.org(\/[^)\s]*)/gm,
        (match, prefix, url) => (localExists(url) ? prefix + url : match),
      );
    planned.set(file, Buffer.from(content));
  }
  // All source, ownership, navigation and link validation precedes writes.
  for (const root of managedRoots) {
    if (!root.endsWith('/ai/skills')) {
      rmSync(within(docs, root), { recursive: true, force: true });
    }
  }
  for (const file of removals) rmSync(within(docs, file), { force: true });
  for (const [file, content] of planned) {
    const target = within(docs, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  writeJson(inventoryPath, { schemaVersion: 1, packageFiles, websiteFiles });
  return { packageFiles, websiteFiles };
}

/** Prepare a public package tree with edit links, then use the common mount. */
export function syncWebsite({ website, source }) {
  const manifest = json(join(source, 'manifest.json'));
  if (manifest.schemaVersion !== 1) {
    throw new Error('Unsupported skills docs ownership contract');
  }
  const scratch = mkdtempSync(join(tmpdir(), 'public-skills-docs-'));
  try {
    const mounts = [];
    const provenance = {};
    for (const section of manifest.sections) {
      if (ROUTES.get(section.id) !== section.route) {
        throw new Error(`Unsupported section: ${section.id}`);
      }
      for (const locale of LOCALES) {
        const from = within(source, section.content[locale]);
        const to = `${locale}/${section.route}`;
        const staged = within(scratch, to);
        cpSync(from, staged, { recursive: true });
        for (const name of files(staged)) {
          const file = `${to}/${name}`;
          const url = `${manifest.editBaseUrl}/${file}`;
          provenance[file] = url;
          if (/\.mdx?$/.test(name)) {
            writeFileSync(
              join(staged, name),
              withEditUrl(readFileSync(join(staged, name), 'utf8'), url),
            );
          }
        }
        mounts.push({ from: staged, to });
      }
    }
    for (const entry of manifest.sharedContent) {
      mounts.push({
        from: within(source, entry.source),
        to: entry.destination,
      });
    }
    for (const entry of manifest.publicAssets) {
      mounts.push({
        from: within(source, entry.source),
        to: `public/${entry.destination}`,
      });
    }
    return mountSkillsDocs({
      website,
      mounts,
      provenance,
      legacyEditBases: [manifest.editBaseUrl],
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
