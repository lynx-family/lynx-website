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
  const manifest = {
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
      {
        source: 'public/ai/agent-lynx',
        destination: 'ai/agent-lynx',
      },
    ],
  };
  write(join(source, 'manifest.json'), manifest);
  write(join(source, 'content/_ai/component.tsx'), 'export const Demo = 1;');
  write(join(source, 'public/ai/agent-lynx/demo.html'), 'demo');
  for (const locale of ['en', 'zh']) {
    write(join(source, `content/${locale}/ai/agent-lynx/_meta.json`), [
      {
        type: 'file',
        name: 'index.mdx',
      },
    ]);
    write(join(source, `content/${locale}/ai/agent-lynx/index.mdx`), '# Agent');
    write(join(source, `content/${locale}/ai/skills/_meta.json`), [
      {
        type: 'file',
        name: 'owned.mdx',
      },
    ]);
    write(
      join(source, `content/${locale}/ai/skills/owned.mdx`),
      '# Package Skill',
    );
    write(join(website, `docs/${locale}/ai/_meta.template.json`), [
      { external: 'agent-lynx' },
      { external: 'skills' },
      { type: 'file', name: 'mcp.mdx' },
    ]);
    write(join(website, `docs/${locale}/ai/mcp.mdx`), '# Website MCP');
  }
  return { website, source, manifest };
}

test('Skills are a disjoint union; hidden website pages and forward anchors work', (t) => {
  const f = fixture(t);
  const dir = join(f.website, 'docs/en/ai/skills');
  const site =
    '---\nsourceEditUrl: "https://example.org/source"\n---\n# Site\n[Link](https://lynxjs.org/ai/skills/owned)';
  write(join(dir, '_meta.site.json'), [
    { name: 'first.mdx', before: 'last.mdx' },
    { name: 'hidden.mdx', sidebar: false },
    { name: 'last.mdx', after: 'owned.mdx' },
  ]);
  for (const name of ['first.mdx', 'last.mdx', 'hidden.mdx']) {
    write(join(dir, name), site);
  }
  const result = syncWebsite(f);
  assert.deepEqual(
    json(join(dir, '_meta.json')).map((x) => x.name),
    ['owned.mdx', 'first.mdx', 'last.mdx'],
  );
  for (const name of ['first.mdx', 'last.mdx', 'hidden.mdx']) {
    assert.equal(text(join(dir, name)), site);
  }
  assert.match(
    text(join(dir, 'owned.mdx')),
    /sourceEditUrl: "https:\/\/github.com/,
  );
  assert.equal(
    result.websiteFiles['en/ai/skills/hidden.mdx'],
    'https://example.org/source',
  );
  assert.ok(!Object.hasOwn(result.packageFiles, 'en/ai/skills/hidden.mdx'));
  assert.equal(text(join(f.website, 'docs/en/ai/mcp.mdx')), '# Website MCP');
});

test('duplicate owners, route aliases, and undeclared collisions fail before mutation', (t) => {
  for (const name of ['owned.mdx', 'owned.md', 'owned/index.mdx']) {
    const f = fixture(t);
    const dir = join(f.website, 'docs/en/ai/skills');
    write(join(dir, name), '# Website source');
    write(join(dir, '_meta.site.json'), [{ name, sidebar: false }]);
    assert.throws(() => syncWebsite(f), /Duplicate documentation ownership/);
    assert.equal(text(join(dir, name)), '# Website source');
    assert.ok(!existsSync(join(f.website, 'docs/en/ai/agent-lynx/index.mdx')));
  }
  const f = fixture(t);
  const file = join(f.website, 'docs/en/ai/skills/owned.mdx');
  write(file, '# Undeclared handwritten page');
  assert.throws(() => syncWebsite(f), /Undeclared ownership collision/);
  assert.equal(text(file), '# Undeclared handwritten page');
});

test('agent-lynx replaces the full tree and accepts package directory navigation', (t) => {
  const f = fixture(t);
  const dir = join(f.source, 'content/en/ai/agent-lynx');
  write(join(dir, '_meta.json'), [
    {
      type: 'dir',
      name: 'nested',
      collapsed: true,
    },
  ]);
  write(join(dir, 'nested/_meta.json'), [{ type: 'file', name: 'guide.mdx' }]);
  write(join(dir, 'nested/guide.mdx'), '# Nested');
  write(join(f.website, 'docs/en/ai/agent-lynx/stale.mdx'), '# Stale');
  syncWebsite(f);
  assert.ok(!existsSync(join(f.website, 'docs/en/ai/agent-lynx/stale.mdx')));
  assert.match(
    text(join(f.website, 'docs/en/ai/agent-lynx/nested/guide.mdx')),
    /# Nested/,
  );
  assert.ok(
    json(join(f.website, 'docs/en/ai/_meta.json')).some(
      (x) => x.name === 'agent-lynx/nested' && x.collapsed,
    ),
  );
  write(join(f.website, 'docs/en/ai/agent-lynx/_meta.site.json'), []);
  assert.throws(() => syncWebsite(f), /agent-lynx is package-owned/);
});

test('only retired package output is removed; site sources are unchanged and sync is repeatable', (t) => {
  const f = fixture(t);
  const target = join(f.website, 'docs/en/ai/skills');
  write(join(target, '_meta.site.json'), [{ name: 'site.mdx' }]);
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
  write(join(target, 'unowned.mdx'), '# Do not remove');
  assert.throws(() => syncWebsite(f), /Undeclared website Skills file/);
  assert.equal(text(join(target, 'unowned.mdx')), '# Do not remove');
});

test('an explicit transfer from old package output to website preserves the page', (t) => {
  const f = fixture(t);
  syncWebsite(f);
  const site = join(f.website, 'docs/en/ai/skills');
  for (const locale of ['en', 'zh']) {
    rmSync(join(f.source, `content/${locale}/ai/skills/owned.mdx`));
    write(join(f.source, `content/${locale}/ai/skills/_meta.json`), []);
  }
  write(join(site, '_meta.site.json'), [{ name: 'owned.mdx' }]);
  write(join(site, 'owned.mdx'), '# Transferred');
  syncWebsite(f);
  assert.equal(text(join(site, 'owned.mdx')), '# Transferred');
  const inventory = json(join(f.website, 'docs/.skills-docs.json'));
  assert.ok(Object.hasOwn(inventory.websiteFiles, 'en/ai/skills/owned.mdx'));
  assert.ok(!Object.hasOwn(inventory.packageFiles, 'en/ai/skills/owned.mdx'));
});

test('missing sources, unsafe paths and conflicting anchors fail before writes', (t) => {
  for (const entries of [
    [{ name: '../outside.mdx' }],
    [{ name: './page.mdx' }],
    [{ name: 'missing.mdx' }],
    [{ name: 'page.mdx', before: 'missing.mdx' }],
    [{ name: 'page.mdx', sidebar: 'false' }],
  ]) {
    const f = fixture(t);
    const dir = join(f.website, 'docs/en/ai/skills');
    write(join(dir, '_meta.site.json'), entries);
    write(join(dir, 'page.mdx'), '# Site');
    assert.throws(() => syncWebsite(f));
    assert.equal(text(join(dir, 'page.mdx')), '# Site');
    assert.ok(!existsSync(join(f.website, 'docs/en/ai/agent-lynx/index.mdx')));
  }
});
