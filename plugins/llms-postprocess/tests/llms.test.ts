import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import type { LlmsTxtContext, LlmsTxtPage, UserConfig } from '@rspress/core';
import { encodingForModel } from 'js-tiktoken';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { createLynxLlms } from '../src/config';
import { renderLynxLlms } from '../src/render';

function page(
  routePath: string,
  overrides: Partial<LlmsTxtPage> = {},
): LlmsTxtPage {
  return {
    routePath,
    link: `/next${routePath.endsWith('/') ? `${routePath}index.md` : routePath.replace(/\.html$/, '.md')}`,
    title: 'Page [title]',
    description: 'Page description',
    frontmatter: {},
    lang: 'en',
    version: '',
    ...overrides,
  };
}

function context(overrides: Partial<LlmsTxtContext> = {}): LlmsTxtContext {
  return {
    title: 'Lynx',
    description: 'Description',
    base: '/next',
    siteOrigin: undefined,
    lang: 'en',
    version: '',
    sections: [
      { title: 'Guide', pages: [page('/guide/start.html')] },
      { title: 'APIs', pages: [page('/api/example.html')] },
    ],
    ...overrides,
  };
}

test('composes AGENTS content and separate API index from structured pages', () => {
  const { llmsTxt, apiIndex } = renderLynxLlms(
    context(),
    '# Read first\n\n[Intro](/guide/intro.md)\n\n[External](https://example.com)\n\n[Fragment](#local)',
  );
  assert.match(llmsTxt, /^# Read first/);
  assert.match(llmsTxt, /https:\/\/lynxjs.org\/next\/guide\/intro.md/);
  assert.match(llmsTxt, /\[External\]\(https:\/\/example.com\)/);
  assert.match(llmsTxt, /\[Fragment\]\(#local\)/);
  assert.match(llmsTxt, /### Guide/);
  assert.match(llmsTxt, /https:\/\/lynxjs.org\/next\/guide\/start.md/);
  assert.doesNotMatch(llmsTxt, /api\/example.md/);
  assert.match(apiIndex!, /# Lynx APIs/);
  assert.match(apiIndex!, /https:\/\/lynxjs.org\/next\/api\/example.md/);
  const ast = fromMarkdown(apiIndex!);
  assert.equal(ast.children.at(-1)?.type, 'list');
  const list = ast.children.at(-1);
  assert.ok(list?.type === 'list');
  const paragraph = list.children[0].children[0];
  assert.ok(paragraph.type === 'paragraph');
  const link = paragraph.children[0];
  assert.ok(link.type === 'link');
  assert.ok(link.children[0].type === 'text');
  assert.equal(link.children[0].value, 'Page [title]');
});

test('filters AGENTS references, excluded routes, and empty sections', () => {
  const routes = [
    '/guide/start.html',
    '/guide/',
    '/guide/devtool/debug.html',
    '/guide/performance/profile.html',
    '/guide/embed/platform.html',
    '/guide/spec.html',
    '/ai/intro.html',
    '/lynx-ui/button.html',
    '/guide/keep.html',
  ];
  const { llmsTxt } = renderLynxLlms(
    context({
      sections: [
        { title: 'Guide', pages: routes.map((route) => page(route)) },
        { title: 'Empty', pages: [] },
      ],
    }),
    '# Read first\n\n[Start](/guide/start.md)\n\n[Index](/guide/index.md)',
  );
  const appendix = llmsTxt.split('## 98. Appendix: Links')[1];
  assert.match(appendix, /guide\/keep.md/);
  for (const part of [
    'start.md',
    'index.md',
    'devtool',
    'performance',
    'embed',
    'spec.md',
    '/ai/',
    '/lynx-ui/',
    '### Empty',
  ]) {
    assert.ok(!appendix.includes(part), part);
  }
  assert.doesNotMatch(llmsTxt, /99\. Appendix: Lynx APIs/);
});

test('caps appendix descriptions at 30 tokens without truncating API descriptions', () => {
  const description = 'A longer description with many words. '.repeat(30);
  const ctx = context();
  for (const section of ctx.sections)
    section.pages[0].description = description;
  const { llmsTxt, apiIndex } = renderLynxLlms(ctx, '# Read first');
  const line = llmsTxt
    .split('\n')
    .find((line) => line.includes('/guide/start.md'))!;
  const truncated = line.split('): ')[1];
  assert.ok(truncated.endsWith('…'));
  assert.ok(encodingForModel('gpt-4o').encode(truncated).length <= 30);
  assert.ok(apiIndex!.includes(description.trim()));
});

test('preserves legacy Markdown formatting in titles and descriptions', () => {
  const apiPage = page('/api/example.html', {
    title: 'MainThreadRef<T>',
    description: '__BACKGROUND__ and `code` with <ReactNode>.',
  });
  const { apiIndex, llmsTxt } = renderLynxLlms(
    context({
      sections: [
        {
          title: 'Guide',
          pages: [
            {
              ...apiPage,
              routePath: '/guide/example.html',
              link: '/next/guide/example.md',
            },
          ],
        },
        { title: 'APIs', pages: [apiPage] },
      ],
    }),
    '# Read first',
  );
  // Frozen output from the removed postprocessor for the same metadata.
  assert.equal(
    apiIndex,
    '# Lynx APIs\n\nBelow is a full list of available APIs of Lynx:\n\n## APIs\n\n* [MainThreadRef<T>](https://lynxjs.org/next/api/example.md): **BACKGROUND** and `code` with <ReactNode>.\n',
  );
  assert.ok(
    llmsTxt.includes(
      '* [MainThreadRef<T>](https://lynxjs.org/next/guide/example.md): **BACKGROUND** and `code` with <ReactNode>.',
    ),
  );
});

for (const base of ['', '/', '/next', '/4.0/']) {
  test(`preserves base ${JSON.stringify(base)} and the Chinese API index URL`, () => {
    const prefix = base.replace(/\/$/, '');
    const ctx = context({
      base,
      lang: 'zh',
      siteOrigin: 'https://docs.example.com/',
      sections: [
        {
          title: 'API',
          pages: [
            page('/zh/api/example.html', {
              link: `https://docs.example.com${prefix}/zh/api/example.md`,
            }),
          ],
        },
      ],
    });
    const { llmsTxt, apiIndex } = renderLynxLlms(
      ctx,
      '# 中文\n\n[介绍](/zh/guide/intro.md)',
    );
    assert.ok(
      llmsTxt.includes(`https://docs.example.com${prefix}/zh/guide/intro.md`),
    );
    assert.ok(
      llmsTxt.includes(`https://docs.example.com${prefix}/zh/api/llms.txt`),
    );
    assert.ok(
      apiIndex!.includes(`https://docs.example.com${prefix}/zh/api/example.md`),
    );
    assert.doesNotMatch(llmsTxt + apiIndex, /https:\/\/[^\s)]+https:/);
  });
}

test('uses the official version prefix for additional API indexes', () => {
  for (const version of ['v1', 'v2']) {
    const { llmsTxt } = renderLynxLlms(
      context({ lang: 'zh', version }),
      '# 中文\n\n[介绍](/zh/guide/intro.md)',
      { defaultVersion: 'v2' },
    );
    assert.ok(
      llmsTxt.includes(
        `/next/${version === 'v2' ? '' : `${version}/`}zh/api/llms.txt`,
      ),
    );
    assert.ok(
      llmsTxt.includes(
        `/next/${version === 'v2' ? '' : `${version}/`}zh/guide/intro.md`,
      ),
    );
  }
});

test('callback reads source AGENTS; plugin only writes extra locale/version API files', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lynx-llms-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const publicDir = path.join(root, 'public');
  const outDir = path.join(root, 'output');
  await fs.mkdir(path.join(publicDir, 'zh'), { recursive: true });
  await fs.writeFile(path.join(publicDir, 'AGENTS.md'), '# English');
  await fs.writeFile(path.join(publicDir, 'zh/AGENTS.md'), '# 中文');
  const { llmsTxt, apiIndexPlugin } = createLynxLlms({
    publicDir,
    siteOrigin: 'https://lynxjs.org',
  });
  const config: UserConfig = {
    outDir,
    lang: 'en',
    llms: { llmsTxt },
    multiVersion: { default: 'v2', versions: ['v1', 'v2'] },
  };
  await apiIndexPlugin.beforeBuild!(config, true);
  const outputs = await Promise.all(
    ['en', 'zh'].flatMap((lang) =>
      ['v1', 'v2'].map((version) => llmsTxt(context({ lang, version }))),
    ),
  );
  assert.match(outputs[0], /^# English/);
  assert.match(outputs[2], /^# 中文/);
  await apiIndexPlugin.afterBuild!(config, false);
  await assert.rejects(fs.stat(outDir), { code: 'ENOENT' });
  await fs.mkdir(outDir);
  await fs.writeFile(path.join(outDir, 'llms.txt'), 'Written by Rspress');
  await apiIndexPlugin.afterBuild!(config, true);
  assert.equal(
    await fs.readFile(path.join(outDir, 'llms.txt'), 'utf8'),
    'Written by Rspress',
  );
  for (const prefix of ['', 'zh/', 'v1/', 'v1/zh/']) {
    assert.match(
      await fs.readFile(path.join(outDir, prefix, 'api/llms.txt'), 'utf8'),
      /# Lynx APIs/,
    );
  }
  await apiIndexPlugin.beforeBuild!(config, true);
  await fs.rm(outDir, { recursive: true });
  await apiIndexPlugin.afterBuild!(config, true);
  await assert.rejects(fs.stat(outDir), { code: 'ENOENT' });
});

test('keeps every version prefix when no default version is configured', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lynx-llms-versions-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'AGENTS.md'), '# Read first');
  const { llmsTxt, apiIndexPlugin } = createLynxLlms({
    publicDir: root,
    siteOrigin: 'https://lynxjs.org',
  });
  const config: UserConfig = {
    lang: 'en',
    multiVersion: { versions: ['v1'] },
    llms: { llmsTxt },
    outDir: path.join(root, 'output'),
  };
  await apiIndexPlugin.beforeBuild!(config, true);
  assert.match(
    await llmsTxt(context({ version: 'v1' })),
    /\/next\/v1\/api\/llms.txt/,
  );
  await apiIndexPlugin.afterBuild!(config, true);
  assert.ok(await fs.stat(path.join(config.outDir!, 'v1/api/llms.txt')));
  await assert.rejects(async () => llmsTxt(context({ lang: 'zh' })), {
    code: 'ENOENT',
  });
});
