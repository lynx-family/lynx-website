// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
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
const PACKAGE = '@lynx-js/agent-lynx-docs';
const LYNXJS_LINK = /(\]\(|^\[[^\]]+\]:\s*)https:\/\/lynxjs\.org(\/[^)\s]*)/gm;

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
export function syncAgentLynxDocs({ website = WEBSITE, source } = {}) {
  website = resolve(website);
  source = resolve(
    source ?? process.env.AGENT_LYNX_DOCS_SOURCE ?? packageSource(website),
  );
  const docs = join(website, 'docs');
  const manifest = JSON.parse(
    readFileSync(join(source, 'manifest.json'), 'utf8'),
  );
  if (manifest.schemaVersion !== 1)
    throw new Error('Unsupported agent-lynx docs manifest version.');

  const copies = [];
  const navigation = [];
  for (const section of manifest.sections) {
    if (section.route !== 'ai/agent-lynx')
      throw new Error(`Unsupported section: ${section.route}`);
    for (const [locale, content] of Object.entries(section.content)) {
      if (!['en', 'zh'].includes(locale))
        throw new Error(`Unsupported locale: ${locale}`);
      const from = within(source, content);
      const to = within(docs, `${locale}/${section.route}`);
      const items = JSON.parse(readFileSync(join(from, '_meta.json'), 'utf8'));
      for (const item of items) {
        if (item.type !== 'file' || !existsSync(within(from, item.name))) {
          throw new Error(`Missing sidebar page: ${locale}/${item.name}`);
        }
      }
      const templateFile = join(docs, locale, 'ai/_meta.template.json');
      const template = JSON.parse(readFileSync(templateFile, 'utf8'));
      if (
        template.filter((item) => item.external === 'agent-lynx').length !== 1
      ) {
        throw new Error(`${templateFile} must mount agent-lynx exactly once.`);
      }
      const meta = template.flatMap((item) =>
        item.external === 'agent-lynx'
          ? [
              { type: 'section-header', label: section.label },
              ...items.map((page) => ({
                ...page,
                name: `agent-lynx/${page.name}`,
              })),
            ]
          : [item],
      );
      navigation.push({ path: join(docs, locale, 'ai/_meta.json'), meta });
      copies.push({ from, to, locale, section });
    }
  }
  for (const entry of manifest.sharedContent) {
    if (entry.destination !== '_agent-lynx')
      throw new Error('Unexpected shared documentation destination.');
    copies.push({
      from: within(source, entry.source),
      to: within(docs, entry.destination),
    });
  }
  for (const entry of manifest.publicAssets) {
    if (entry.destination !== 'ai/agent-lynx')
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
  for (const { to, locale, section } of copies) {
    if (!locale) continue;
    for (const name of readdirSync(to, { recursive: true })) {
      if (!/\.mdx?$/.test(name)) continue;
      const file = join(to, name);
      let text = readFileSync(file, 'utf8');
      // Keep the lynx-stack policy: targets absent from this build stay external.
      text = text.replace(LYNXJS_LINK, (match, prefix, url) =>
        localPageExists(docs, url) ? prefix + url : match,
      );
      const editUrl = `${manifest.editBaseUrl}/${locale}/${section.route}/${name.split(sep).join('/')}`;
      const editField = `sourceEditUrl: ${JSON.stringify(editUrl)}\n`;
      text = text.startsWith('---\n')
        ? text.replace(/^---\n/, `---\n${editField}`)
        : `---\n${editField}---\n\n${text}`;
      writeFileSync(file, text);
    }
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
  const result = syncAgentLynxDocs({ source });
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
          syncAgentLynxDocs({ source: result.source });
          console.log(`Updated ${relative(WEBSITE, result.source)}`);
        } catch (error) {
          console.error(error);
        }
      }, 100);
    });
    console.log('Watching agent-lynx documentation sources.');
  }
}
