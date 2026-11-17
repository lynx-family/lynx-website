// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { syncWebsite } from './skills-docs.mjs';

const text = (file) => readFileSync(file, 'utf8');
const json = (file) => JSON.parse(text(file));
function write(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    typeof value === 'string' ? value : JSON.stringify(value),
  );
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'skills-mount-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const website = join(root, 'website');
  const source = join(root, 'package');
  write(join(source, 'manifest.json'), {
    schemaVersion: 1,
    editBaseUrl:
      'https://github.com/lynx-community/skills/blob/main/packages/skills-docs/content',
    sections: ['agent-lynx', 'skills'].map((id) => ({
      id,
      route: `ai/${id}`,
      content: { en: `content/en/ai/${id}`, zh: `content/zh/ai/${id}` },
    })),
    sharedContent: [{ source: 'content/_ai', destination: '_ai' }],
    publicAssets: [
      { source: 'public/ai/agent-lynx', destination: 'ai/agent-lynx' },
    ],
  });
  write(join(source, 'content/_ai/component.tsx'), 'export const Demo = 1;');
  write(join(source, 'public/ai/agent-lynx/demo.html'), 'demo');
  for (const locale of ['en', 'zh']) {
    write(join(source, `content/${locale}/ai/agent-lynx/_meta.json`), [
      { type: 'file', name: 'index.mdx' },
    ]);
    write(join(source, `content/${locale}/ai/agent-lynx/index.mdx`), '# Agent');
    write(join(source, `content/${locale}/ai/skills/_meta.json`), [
      { type: 'file', name: 'owned.mdx' },
    ]);
    write(
      join(source, `content/${locale}/ai/skills/owned.mdx`),
      '# Package Skill',
    );
    write(
      join(website, `docs/${locale}/ai/_meta.js`),
      `module.exports = meta => [...meta, {type: 'file', name: 'mcp.mdx'}];`,
    );
    write(join(website, `docs/${locale}/ai/mcp.mdx`), '# Website MCP');
  }
  return { website, source };
}

test('metadata controls order while unlisted website pages and resources remain published', (t) => {
  const f = fixture(t);
  const dir = join(f.website, 'docs/en/ai/skills');
  const site = '---\nsourceEditUrl: "https://example.org/source"\n---\n# Site';
  write(
    join(dir, '_meta.js'),
    `module.exports = meta => [{type: 'divider'}, 'first', ...meta, {type: 'file', name: 'last.mdx'}];`,
  );
  for (const name of ['first.mdx', 'last.mdx', 'hidden.mdx'])
    write(join(dir, name), site);
  write(join(dir, 'examples/demo.txt'), 'website resource');
  const result = syncWebsite(f);
  assert.deepEqual(json(join(dir, '_meta.json')), [
    { type: 'divider' },
    'first',
    { type: 'file', name: 'owned.mdx' },
    { type: 'file', name: 'last.mdx' },
  ]);
  for (const name of ['first.mdx', 'last.mdx', 'hidden.mdx'])
    assert.equal(text(join(dir, name)), site);
  assert.equal(
    result.websiteFiles['en/ai/skills/hidden.mdx'],
    'https://example.org/source',
  );
  assert.ok(
    Object.hasOwn(result.websiteFiles, 'en/ai/skills/examples/demo.txt'),
  );
  assert.equal(text(join(f.website, 'docs/en/ai/mcp.mdx')), '# Website MCP');
  assert.ok(!text(join(dir, '_meta.json')).includes('hidden'));
});

test('duplicate file owners and page routes fail before mutation', (t) => {
  for (const name of ['owned.mdx', 'owned.md', 'owned/index.mdx']) {
    const f = fixture(t);
    const file = join(f.website, 'docs/en/ai/skills', name);
    write(file, '# Website source');
    assert.throws(() => syncWebsite(f), /Duplicate documentation ownership/);
    assert.equal(text(file), '# Website source');
    assert.ok(!existsSync(join(f.website, 'docs/en/ai/agent-lynx/index.mdx')));
  }
});

test('agent-lynx replaces the full tree and retains nested package navigation', (t) => {
  const f = fixture(t);
  const dir = join(f.source, 'content/en/ai/agent-lynx');
  write(join(dir, '_meta.json'), [
    { type: 'dir', name: 'nested', collapsed: true },
  ]);
  write(join(dir, 'nested/_meta.json'), ['guide']);
  write(join(dir, 'nested/guide.mdx'), '# Nested');
  write(join(f.website, 'docs/en/ai/agent-lynx/stale.mdx'), '# Stale');
  syncWebsite(f);
  assert.ok(!existsSync(join(f.website, 'docs/en/ai/agent-lynx/stale.mdx')));
  assert.equal(
    text(join(f.website, 'docs/en/ai/agent-lynx/nested/guide.mdx')).includes(
      '# Nested',
    ),
    true,
  );
  assert.ok(
    json(join(f.website, 'docs/en/ai/_meta.json')).some(
      (x) => x.name === 'agent-lynx/nested' && x.collapsed,
    ),
  );
});

test('only retired package output is removed and repeated sync preserves website files', (t) => {
  const f = fixture(t);
  const target = join(f.website, 'docs/en/ai/skills');
  write(
    join(target, '_meta.js'),
    `module.exports = meta => [...meta, 'site'];`,
  );
  write(join(target, 'site.mdx'), '# Keep site');
  syncWebsite(f);
  for (const locale of ['en', 'zh']) {
    const source = join(f.source, `content/${locale}/ai/skills`);
    rmSync(join(source, 'owned.mdx'));
    write(join(source, '_meta.json'), []);
  }
  write(
    join(f.source, 'content/en/ai/agent-lynx/index.mdx'),
    '# Agent\n[Old](https://lynxjs.org/ai/skills/owned)',
  );
  syncWebsite(f);
  assert.ok(!existsSync(join(target, 'owned.mdx')));
  assert.equal(text(join(target, 'site.mdx')), '# Keep site');
  assert.match(
    text(join(f.website, 'docs/en/ai/agent-lynx/index.mdx')),
    /https:\/\/lynxjs.org\/ai\/skills\/owned/,
  );
  const inventory = text(join(f.website, 'docs/.skills-docs.json'));
  syncWebsite(f);
  assert.equal(text(join(f.website, 'docs/.skills-docs.json')), inventory);
});

test('a document transferred to the website retains its new edit source', (t) => {
  const f = fixture(t);
  syncWebsite(f);
  for (const locale of ['en', 'zh']) {
    rmSync(join(f.source, `content/${locale}/ai/skills/owned.mdx`));
    write(join(f.source, `content/${locale}/ai/skills/_meta.json`), []);
  }
  const site = join(f.website, 'docs/en/ai/skills');
  const content =
    '---\nsourceEditUrl: "https://example.org/website/owned.mdx"\n---\n# Transferred';
  write(join(site, 'owned.mdx'), content);
  syncWebsite(f);
  assert.equal(text(join(site, 'owned.mdx')), content);
  assert.ok(
    Object.hasOwn(
      json(join(f.website, 'docs/.skills-docs.json')).websiteFiles,
      'en/ai/skills/owned.mdx',
    ),
  );
});

test('plain JSON navigation and invalid or duplicate navigation targets are checked', (t) => {
  const f = fixture(t);
  const target = join(f.website, 'docs/en/ai/skills');
  write(join(target, '_meta.json'), ['owned']);
  syncWebsite(f);
  assert.deepEqual(json(join(target, '_meta.json')), ['owned']);
  for (const entries of [
    ['../outside'],
    ['missing'],
    ['owned', { type: 'file', name: 'owned.mdx' }],
  ]) {
    write(join(target, '_meta.json'), entries);
    assert.throws(() => syncWebsite(f));
    assert.deepEqual(json(join(target, '_meta.json')), entries);
  }
});
