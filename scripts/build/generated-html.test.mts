import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeGeneratedRoute,
  removeBrokenLanguageAlternates,
} from './generated-html.mts';

const routes = new Set(['/', '/guide', '/zh/guide', '/zh/接口/Example']);
const page = {
  siteUrl: 'https://lynxjs.org/',
  base: '/next/',
  pagePath: 'guide.html',
};
const sanitize = (html: string) =>
  removeBrokenLanguageAlternates(html, routes, page);

test('preserves resource alternates even with a language attribute', () => {
  for (const type of [
    'text/markdown',
    'application/rss+xml',
    'application/atom+xml',
    'application/json',
  ]) {
    for (const element of ['link', 'a']) {
      const opening = `<${element} rel="alternate" hreflang="zh-CN" type="${type}" href="/next/missing">`;
      const html = element === 'a' ? `${opening}Download</a>` : opening;
      assert.equal(sanitize(html), html);
    }
  }
  const markdown =
    '<link rel="alternate" type="text/markdown" href="/next/guide.md">';
  assert.equal(sanitize(markdown), markdown);
});

test('repairs missing HTML language targets and keeps switcher content', () => {
  assert.equal(
    sanitize(
      '<link href="/next/zh/missing.html" type="text/html" hreflang="zh" rel="alternate">',
    ),
    '',
  );
  assert.equal(
    sanitize(
      '<a href="/next/zh/missing.html" hrefLang="zh" lang="zh" rel="alternate" class="rp-link switcher"><b class="rp-link">中文</b></a>',
    ),
    '<span aria-disabled="true" lang="zh" class=" switcher"><b class="rp-link">中文</b></span>',
  );
});

test('preserves valid routes including index, relative and encoded URLs', () => {
  for (const href of [
    '/next/zh/guide.html?source=language#overview',
    'https://lynxjs.org/next/zh/guide/index.html',
    'zh/guide.html',
    '/next/zh/%E6%8E%A5%E5%8F%A3/Example.html',
    '/next/',
    '/next',
  ]) {
    const html = `<link rel="alternate" hreflang="zh" href="${href}">`;
    assert.equal(sanitize(html), html, href);
  }
});

test('preserves other origins, deployments and malformed URLs', () => {
  for (const href of [
    'https://example.com/next/zh/missing.html',
    '//example.com/next/zh/missing.html',
    '/3.9/zh/missing.html',
    '/next-other/zh/missing.html',
    '/zh/missing.html',
    'https://lynxjs.org.evil.example/next/missing.html',
    '/next/%ZZ',
    'https://[',
  ]) {
    const html = `<a rel="alternate" hrefLang="zh" href="${href}">中文</a>`;
    assert.equal(sanitize(html), html, href);
  }
});

test('selects real attributes and supports rel tokens and HTML casing', () => {
  assert.equal(
    sanitize(
      "<LINK REL='ALTERNATE canonical' HREFLANG='zh' TYPE='TEXT/HTML' HREF='/next/missing.html'>",
    ),
    '',
  );
  for (const attrs of [
    'rel="alternate"',
    'rel="canonical" hreflang="zh"',
    'data-rel="alternate" hreflang="zh"',
    'rel="alternate" data-hreflang="zh"',
    'rel="alternate" hreflang="zh" data-href="/next/missing"',
  ]) {
    const html = `<link ${attrs}>`;
    assert.equal(sanitize(html), html);
  }
});

test('resolves nested relative URLs and uses the supplied deployment base', () => {
  const html = '<link rel="alternate" hreflang="zh" href="../zh/guide.html">';
  assert.equal(
    removeBrokenLanguageAlternates(html, routes, {
      ...page,
      base: '/3.9/',
      pagePath: 'guide/example.html',
    }),
    html,
  );
  for (const base of ['/', '/3.9/']) {
    assert.equal(
      removeBrokenLanguageAlternates(
        `<link rel="alternate" hreflang="zh" href="${base}missing.html">`,
        routes,
        { ...page, base },
      ),
      '',
    );
  }
});

test('normalizes the HTML output layouts used by the route set', () => {
  for (const input of ['guide.html', 'guide/index.html', '/guide/', 'guide']) {
    assert.equal(normalizeGeneratedRoute(input), '/guide');
  }
  assert.equal(normalizeGeneratedRoute('index.html'), '/');
  assert.equal(normalizeGeneratedRoute('zh\\guide.html'), '/zh/guide');
});
