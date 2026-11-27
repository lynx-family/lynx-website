import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Tooltip from '@radix-ui/react-tooltip';
import { clsx } from 'clsx';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { twMerge } from 'tailwind-merge';

import { loadTsxModule } from './test-support/load-tsx-module.mjs';

const h = React.createElement;
const versioning = await loadTsxModule(
  new URL('../src/versioning/sdk-since.ts', import.meta.url),
  {},
);
const release = JSON.parse(
  fs.readFileSync(
    new URL('../src/versioning/lynx-sdk-release.json', import.meta.url),
  ),
);
const siteSettings = { latestStable: '4.4', baseline: '3.2' };

async function renderer({
  sdkVersioning = siteSettings,
  ssg = false,
  page = { pagePath: 'en/guide/example.mdx', frontmatter: { since: '4.5' } },
} = {}) {
  const runtime = {
    useSite: () => ({ site: { themeConfig: { sdkVersioning } } }),
    usePage: () => ({ page }),
    useI18n:
      () =>
      (key, values = {}) =>
        `${key} ${Object.entries(values)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')}`,
  };
  const browserOnly = () => {
    throw new Error('Markdown must bypass interactive UI and themed callouts');
  };
  const shared = {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    '@rspress/core/runtime': runtime,
    '../../lib/utils': { cn: (...inputs) => twMerge(clsx(inputs)) },
  };
  const { useSdkSince } = await loadTsxModule(
    new URL('../src/components/version-info/useSdkSince.tsx', import.meta.url),
    {
      ...shared,
      '../../versioning/lynx-sdk-release.json': { default: release },
      '../../versioning/sdk-since': versioning,
    },
  );
  const { SinceIndicator } = await loadTsxModule(
    new URL(
      '../src/components/version-info/SinceIndicator.tsx',
      import.meta.url,
    ),
    {
      ...shared,
      './SinceIndicator.module.css': { default: { content: 'since-content' } },
      '../ui/collapsible': {
        Collapsible: ssg ? browserOnly : Collapsible.Root,
        CollapsibleTrigger: ssg ? browserOnly : Collapsible.Trigger,
        CollapsibleContent: ssg ? browserOnly : Collapsible.Content,
      },
      '../ui/tooltip': {
        Tooltip: ssg ? browserOnly : Tooltip.Root,
        TooltipProvider: ssg ? browserOnly : Tooltip.Provider,
        TooltipTrigger: ssg ? browserOnly : Tooltip.Trigger,
        TooltipContent: ssg ? browserOnly : Tooltip.Content,
      },
    },
  );
  const { Since } = await loadTsxModule(
    new URL('../src/components/version-info/Since.tsx', import.meta.url),
    {
      ...shared,
      './useSdkSince': { useSdkSince },
      './SinceIndicator': {
        SinceIndicator: ssg ? browserOnly : SinceIndicator,
      },
      '../Callout': {
        Note: ssg ? browserOnly : ({ children }) => h('aside', null, children),
      },
    },
    { SSG_MD: ssg },
  );
  const { default: PageSdkSince } = await loadTsxModule(
    new URL('../theme/versioning/PageSdkSince.tsx', import.meta.url),
    {
      ...shared,
      '../../src/components/version-info/useSdkSince': { useSdkSince },
      '../../src/components/version-info/SinceIndicator': {
        SinceIndicator: ssg ? browserOnly : SinceIndicator,
      },
      '../../src/versioning/sdk-since': versioning,
    },
    { SSG_MD: ssg },
  );
  return {
    local: (props) => renderToStaticMarkup(h(Since, props)),
    page: (props) => renderToStaticMarkup(h(PageSdkSince, props)),
  };
}

test('local indicators inherit site settings and override each field independently', async () => {
  const render = await renderer();
  const released = render.local({ since: '4.3' });
  assert.match(released, /sdk-since--local/);
  assert.match(released, /sdkVersion=4\.3/);
  assert.doesNotMatch(released, /<button/);
  assert.match(render.local({ since: '4.3', latestStable: '4.2' }), /<button/);
  assert.equal(render.local({ since: '3.2' }), '');
  assert.equal(render.local({ since: '3.2', latestStable: '4.5' }), '');
  assert.match(
    render.local({ since: '3.2', baseline: '3.1' }),
    /sdkVersion=3\.2/,
  );
});

test('consumers without site settings retain the release default and no baseline', async () => {
  const render = await renderer({ sdkVersioning: null });
  assert.match(render.local({ since: '3.2' }), /sdkVersion=3\.2/);
  const markdown = render.local({ since: '99.0', format: 'markdown' });
  assert.ok(markdown.includes(`latestStable=${release.latestStable}`));
  assert.equal(render.local({}), '');
  assert.throws(() => render.local({ since: 4.3 }), /quoted SDK version/);
});

test('the site can disable release status without hiding SDK requirements or children', async () => {
  const settings = { ...siteSettings, showReleaseStatus: false };
  const render = await renderer({ sdkVersioning: settings });
  const local = render.local({
    since: '4.5',
    latestStable: '4.2',
    // Runtime MDX props cannot bypass the site-wide setting.
    showReleaseStatus: true,
    children: h('p', null, 'QuickJS only'),
  });
  for (const html of [local, render.page()]) {
    assert.match(html, /sdkVersion=4\.5/);
    assert.match(html, /viewBox="0 0 172 256"/);
    assert.doesNotMatch(html, /<button|aria-expanded|sdk\.since\.ahead/);
  }
  assert.match(local, /<p>QuickJS only<\/p>/);
  assert.equal(render.local({ since: '3.2' }), '');
  assert.match(
    render.local({ since: '3.2', children: 'Platform requirement' }),
    /Platform requirement/,
  );

  for (const ssg of [false, true]) {
    const markdown = await renderer({ sdkVersioning: settings, ssg });
    const format = ssg ? {} : { format: 'markdown' };
    assert.equal(
      markdown.local({
        ...format,
        since: '4.5',
        latestStable: '4.2',
        showReleaseStatus: true,
        children: h('p', null, 'QuickJS only'),
      }),
      '<blockquote><p>sdk.since.released sdkVersion=4.5</p><p>QuickJS only</p></blockquote>',
    );
    assert.equal(
      markdown.page(format),
      '<p>sdk.since.released sdkVersion=4.5</p>',
    );
    assert.equal(
      markdown.local({ ...format, since: '3.2' }),
      '<p>sdk.since.released sdkVersion=3.2</p>',
    );
  }
});

test('enabling release status preserves the default for page and local rendering', async () => {
  const implicit = await renderer();
  const explicit = await renderer({
    sdkVersioning: { ...siteSettings, showReleaseStatus: true },
  });
  assert.match(explicit.local({ since: '4.5' }), /<button/);
  assert.match(explicit.page(), /<button/);
  assert.equal(
    explicit.local({ since: '4.5', format: 'markdown' }),
    implicit.local({ since: '4.5', format: 'markdown' }),
  );
  assert.equal(
    explicit.page({ format: 'markdown' }),
    implicit.page({ format: 'markdown' }),
  );
});

test('baseline suppression and collapsed release details never hide authored children', async () => {
  const render = await renderer();
  const children = h('p', null, 'QuickJS only');
  const hidden = render.local({ since: '3.2', children });
  assert.match(hidden, /role="note"/);
  assert.match(hidden, /<p>QuickJS only<\/p>/);
  assert.doesNotMatch(hidden, /sdk-since-indicator|sdkVersion|<svg|<button/);
  const unreleased = render.local({ since: '4.5', children });
  assert.match(unreleased, /aria-expanded="false"/);
  assert.match(unreleased, /<p>QuickJS only<\/p>/);
  assert.doesNotMatch(unreleased, /sdk\.since\.description/);
  assert.equal(render.local({ children }), '<p>QuickJS only</p>');
  assert.equal(render.local({ since: '3.2', children: [false, null] }), '');
  assert.match(render.local({ since: '3.2', children: 0 }), />0<\/div>/);
});

test('Markdown retains facts and groups children once in both export paths', async () => {
  for (const ssg of [true, false]) {
    const render = await renderer({ ssg });
    const props = {
      since: '4.5',
      latestStable: '4.2',
      baseline: '4.5',
      ...(ssg ? {} : { format: 'markdown' }),
    };
    const plain = render.local(props);
    assert.match(plain, /^<p>sdk\.since\.released sdkVersion=4\.5<\/p>/);
    assert.match(plain, /sdk\.since\.ahead/);
    assert.match(plain, /latestStable=4\.2/);
    assert.match(plain, /https:\/\/github\.com\/lynx-family\/lynx\/releases/);
    assert.doesNotMatch(plain, /<blockquote|<svg|<button|<aside/);
    const grouped = render.local({
      ...props,
      children: h('p', null, 'QuickJS only'),
    });
    assert.equal(
      grouped,
      `<blockquote>${plain}<p>QuickJS only</p></blockquote>`,
    );
    const promoted = render.local({ ...props, latestStable: '4.5' });
    assert.match(promoted, /sdkVersion=4\.5/);
    assert.doesNotMatch(promoted, /sdk\.since\.ahead|sdk\.since\.description/);
  }
});

test('page renderer owns neutral presentation and preserves Markdown facts', async () => {
  const render = await renderer();
  assert.match(render.page(), /sdk-since--page/);
  assert.doesNotMatch(render.page(), /sdk-since--local/);
  for (const ssg of [true, false]) {
    const hiddenPage = await renderer({
      ssg,
      page: { pagePath: 'zh/guide/example.md', frontmatter: { since: '3.2' } },
    });
    if (!ssg) assert.equal(hiddenPage.page(), '');
    const props = ssg ? {} : { format: 'markdown' };
    assert.equal(
      hiddenPage.page(props),
      '<p>sdk.since.released sdkVersion=3.2</p>',
    );
    const unreleasedPage = await renderer({ ssg });
    const markdown = unreleasedPage.page(props);
    assert.match(markdown, /sdkVersion=4\.5/);
    assert.match(markdown, /sdk\.since\.ahead/);
    assert.doesNotMatch(markdown, /<blockquote|<svg|<button|<aside/);
  }
});

test('page metadata is limited to handwritten guide document layouts', async () => {
  for (const page of [
    { pagePath: 'en/api/example.mdx', frontmatter: { since: '4.5' } },
    {
      pagePath: 'en/guide/example.mdx',
      pageType: 'home',
      frontmatter: { since: '4.5' },
    },
    { pagePath: 'en/guide/example.mdx' },
  ]) {
    const render = await renderer({ page });
    assert.equal(render.page(), '');
    assert.equal(render.page({ format: 'markdown' }), '');
  }
});
