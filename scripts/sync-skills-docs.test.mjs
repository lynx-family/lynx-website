// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
import { test } from 'node:test';

import { syncSkillsDocs } from './sync-skills-docs.mjs';

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    typeof content === 'string' ? content : JSON.stringify(content),
  );
}

function fixture(t) {
  const website = mkdtempSync(join(tmpdir(), 'skills-docs-'));
  t.after(() => rmSync(website, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet'], { cwd: website });
  write(
    join(website, '.gitignore'),
    [
      'node_modules/',
      'docs/*/ai/agent-lynx/',
      'docs/*/ai/skills/',
      'docs/*/ai/_meta.json',
      'docs/_ai/',
      'docs/public/ai/agent-lynx/',
      'docs/public/ai/skills/',
      '',
    ].join('\n'),
  );
  write(join(website, 'package.json'), {
    name: 'docs-consumer',
    private: true,
  });
  const source = join(website, 'node_modules/@lynx-js/skills-docs');
  write(join(source, 'package.json'), {
    name: '@lynx-js/skills-docs',
    exports: { './manifest.json': './manifest.json' },
  });
  const manifest = {
    schemaVersion: 1,
    sections: [
      {
        id: 'agent-lynx',
        route: 'ai/agent-lynx',
        label: 'agent-lynx',
        content: {
          en: 'content/en/ai/agent-lynx',
          zh: 'content/zh/ai/agent-lynx',
        },
      },
      {
        id: 'skills',
        route: 'ai/skills',
        label: 'Skills',
        content: {
          en: 'content/en/ai/skills',
          zh: 'content/zh/ai/skills',
        },
      },
    ],
    sharedContent: [{ source: 'content/_ai', destination: '_ai' }],
    publicAssets: [
      { source: 'public/ai/agent-lynx', destination: 'ai/agent-lynx' },
      { source: 'public/ai/skills', destination: 'ai/skills' },
    ],
    editBaseUrl:
      'https://github.com/lynx-community/skills/edit/main/packages/skills-docs/content',
  };
  write(join(source, 'manifest.json'), manifest);
  write(
    join(source, 'content/_ai/conversation.tsx'),
    'export const Conversation = () => null;\n',
  );
  write(join(source, 'public/ai/agent-lynx/demo.html'), '<main>Demo</main>');
  write(join(source, 'public/ai/skills/example.json'), '{"example":true}');
  for (const locale of ['en', 'zh']) {
    const prefix = locale === 'zh' ? '/zh' : '';
    write(join(website, `docs/${locale}/guide/recorder.mdx`), '# Recorder\n');
    write(join(website, `docs/${locale}/ai/mcp.mdx`), '# DevTool MCP\n');
    write(join(website, `docs/${locale}/ai/_meta.template.json`), [
      { type: 'file', name: 'index.mdx' },
      { external: 'agent-lynx' },
      { external: 'skills' },
      { type: 'section-header', label: 'Tools' },
      { type: 'file', name: 'mcp.mdx', label: 'Lynx DevTool MCP' },
    ]);
    write(join(source, `content/${locale}/ai/agent-lynx/_meta.json`), [
      {
        type: 'file',
        name: 'index.mdx',
        label: locale === 'zh' ? '简介' : 'Introduction',
      },
    ]);
    write(
      join(source, `content/${locale}/ai/agent-lynx/index.mdx`),
      [
        '---',
        'description: Lynx for your agent',
        '---',
        "import { Conversation } from '../../../_ai/conversation';",
        '# agent-lynx',
        `[Recorder](https://lynxjs.org${prefix}/guide/recorder.html?mode=all#replay)`,
        `[Reference]: https://lynxjs.org${prefix}/guide/recorder#replay`,
        `[Future](https://lynxjs.org${prefix}/guide/not-in-this-version.html)`,
        '[Elsewhere](https://example.org/guide/recorder)',
        '[Simulator](simulator.mdx)',
        `[Skill](https://lynxjs.org${prefix}/ai/skills/lynx-devtool)`,
        '',
      ].join(locale === 'zh' ? '\r\n' : '\n'),
    );
    write(
      join(source, `content/${locale}/ai/agent-lynx/simulator.mdx`),
      '# Simulator preview\n',
    );
    write(join(source, `content/${locale}/ai/skills/_meta.json`), [
      { type: 'file', name: 'lynx-devtool.mdx' },
    ]);
    write(
      join(source, `content/${locale}/ai/skills/lynx-devtool.mdx`),
      [
        '# lynx-devtool',
        '[CLI](../agent-lynx/index.mdx)',
        `[Recorder](https://lynxjs.org${prefix}/guide/recorder#replay)`,
        '',
      ].join('\n'),
    );
  }
  return { website, source, manifest };
}

test('installed package mounts both sections and locales, shared modules, assets, and navigation', (t) => {
  const { website } = fixture(t);
  // Use installed-package resolution, without a source override.
  syncSkillsDocs({ website });
  for (const locale of ['en', 'zh']) {
    const prefix = locale === 'zh' ? '/zh' : '';
    const page = readFileSync(
      join(website, `docs/${locale}/ai/agent-lynx/index.mdx`),
      'utf8',
    );
    // Preserve the original metadata in the same frontmatter block when the
    // source comes from either an LF or a Windows CRLF checkout.
    const frontmatter = page.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
    assert.ok(frontmatter?.includes('description: Lynx for your agent'));
    assert.ok(frontmatter?.includes('sourceEditUrl:'));
    assert.ok(
      page.includes(
        `[Recorder](${prefix}/guide/recorder.html?mode=all#replay)`,
      ),
    );
    assert.ok(page.includes(`[Reference]: ${prefix}/guide/recorder#replay`));
    assert.ok(
      page.includes(
        `[Future](https://lynxjs.org${prefix}/guide/not-in-this-version.html)`,
      ),
    );
    assert.ok(page.includes('[Elsewhere](https://example.org/guide/recorder)'));
    assert.ok(page.includes('[Simulator](simulator.mdx)'));
    // All sections are copied before website links are resolved, including a
    // forward reference to a page from the second section.
    assert.ok(page.includes(`[Skill](${prefix}/ai/skills/lynx-devtool)`));
    assert.ok(
      page.includes(
        `sourceEditUrl: "https://github.com/lynx-community/skills/blob/main/packages/skills-docs/content/${locale}/ai/agent-lynx/index.mdx"`,
      ),
    );
    assert.ok(page.includes('description: Lynx for your agent'));
    assert.deepEqual(
      JSON.parse(
        readFileSync(join(website, `docs/${locale}/ai/_meta.json`), 'utf8'),
      ),
      [
        { type: 'file', name: 'index.mdx' },
        { type: 'section-header', label: 'agent-lynx' },
        {
          type: 'file',
          name: 'agent-lynx/index.mdx',
          label: locale === 'zh' ? '简介' : 'Introduction',
        },
        { type: 'section-header', label: 'Skills' },
        { type: 'file', name: 'skills/lynx-devtool.mdx' },
        { type: 'section-header', label: 'Tools' },
        { type: 'file', name: 'mcp.mdx', label: 'Lynx DevTool MCP' },
      ],
    );
    // Hidden pages stay routable; the source controls only sidebar visibility.
    assert.ok(
      existsSync(join(website, `docs/${locale}/ai/agent-lynx/simulator.mdx`)),
    );
    assert.equal(
      readFileSync(join(website, `docs/${locale}/ai/mcp.mdx`), 'utf8'),
      '# DevTool MCP\n',
    );
    const skill = readFileSync(
      join(website, `docs/${locale}/ai/skills/lynx-devtool.mdx`),
      'utf8',
    );
    assert.ok(skill.includes('[CLI](../agent-lynx/index.mdx)'));
    assert.ok(skill.includes(`[Recorder](${prefix}/guide/recorder#replay)`));
    assert.ok(skill.startsWith('---\nsourceEditUrl:'));
    assert.ok(
      skill.includes(
        `sourceEditUrl: "https://github.com/lynx-community/skills/blob/main/packages/skills-docs/content/${locale}/ai/skills/lynx-devtool.mdx"`,
      ),
    );
  }
  assert.ok(existsSync(join(website, 'docs/_ai/conversation.tsx')));
  assert.equal(
    readFileSync(join(website, 'docs/public/ai/agent-lynx/demo.html'), 'utf8'),
    '<main>Demo</main>',
  );
  assert.equal(
    readFileSync(join(website, 'docs/public/ai/skills/example.json'), 'utf8'),
    '{"example":true}',
  );
});

test('updating a package removes stale generated files and is repeatable', (t) => {
  const { website, source } = fixture(t);
  syncSkillsDocs({ website, source });
  const stale = [
    'docs/en/ai/agent-lynx/old.mdx',
    'docs/zh/ai/agent-lynx/old.mdx',
    'docs/en/ai/skills/old.mdx',
    'docs/zh/ai/skills/old.mdx',
    'docs/_ai/old.tsx',
    'docs/public/ai/agent-lynx/old.html',
    'docs/public/ai/skills/old.json',
  ];
  for (const file of stale) write(join(website, file), 'stale');
  syncSkillsDocs({ website, source });
  for (const file of stale) assert.ok(!existsSync(join(website, file)), file);
  const page = join(website, 'docs/en/ai/agent-lynx/index.mdx');
  const before = readFileSync(page, 'utf8');
  syncSkillsDocs({ website, source });
  assert.equal(readFileSync(page, 'utf8'), before);
});

test('invalid navigation slots and duplicate sections fail before modifying either section', (t) => {
  const { website, source, manifest } = fixture(t);
  syncSkillsDocs({ website, source });
  const targets = [
    'docs/en/ai/agent-lynx/index.mdx',
    'docs/en/ai/skills/lynx-devtool.mdx',
    'docs/en/ai/_meta.json',
  ];
  const before = targets.map((file) =>
    readFileSync(join(website, file), 'utf8'),
  );
  const templateFile = join(website, 'docs/en/ai/_meta.template.json');
  const template = JSON.parse(readFileSync(templateFile, 'utf8'));
  for (const [items, error] of [
    [
      template.filter((item) => item.external !== 'skills'),
      /mount skills exactly once/,
    ],
    [[...template, { external: 'skills' }], /mount skills exactly once/],
    [[...template, { external: 'other' }], /Unknown documentation slot/],
  ]) {
    write(templateFile, items);
    assert.throws(() => syncSkillsDocs({ website, source }), error);
  }
  write(templateFile, template);
  write(join(source, 'manifest.json'), {
    ...manifest,
    sections: [...manifest.sections, manifest.sections[0]],
  });
  assert.throws(() => syncSkillsDocs({ website, source }), /Duplicate section/);
  assert.deepEqual(
    targets.map((file) => readFileSync(join(website, file), 'utf8')),
    before,
  );
});

test('a missing skill page or locale fails before replacing generated content', (t) => {
  const { website, source, manifest } = fixture(t);
  const sentinel = join(website, 'docs/en/ai/agent-lynx/index.mdx');
  write(sentinel, 'existing document');
  const skill = join(source, 'content/en/ai/skills/lynx-devtool.mdx');
  rmSync(skill);
  assert.throws(
    () => syncSkillsDocs({ website, source }),
    /Missing sidebar page/,
  );
  write(skill, '# lynx-devtool');
  delete manifest.sections[1].content.zh;
  write(join(source, 'manifest.json'), manifest);
  assert.throws(
    () => syncSkillsDocs({ website, source }),
    /Missing zh content/,
  );
  assert.equal(readFileSync(sentinel, 'utf8'), 'existing document');
});

test('an invalid package or unignored output fails before replacing existing content', (t) => {
  const { website, source, manifest } = fixture(t);
  const sentinel = join(website, 'docs/en/ai/agent-lynx/index.mdx');
  write(sentinel, 'existing document');
  write(join(source, 'manifest.json'), { ...manifest, schemaVersion: 99 });
  assert.throws(() => syncSkillsDocs({ website, source }), /manifest version/);
  assert.equal(readFileSync(sentinel, 'utf8'), 'existing document');
  write(join(source, 'manifest.json'), manifest);
  rmSync(join(source, 'public/ai/agent-lynx'), { recursive: true });
  assert.throws(
    () => syncSkillsDocs({ website, source }),
    /Missing package content/,
  );
  assert.equal(readFileSync(sentinel, 'utf8'), 'existing document');
  write(join(source, 'public/ai/agent-lynx/demo.html'), '<main>Demo</main>');
  write(join(website, '.gitignore'), 'node_modules/\n');
  assert.throws(
    () => syncSkillsDocs({ website, source }),
    /must be ignored by Git/,
  );
  assert.equal(readFileSync(sentinel, 'utf8'), 'existing document');
});
