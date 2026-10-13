import assert from 'node:assert/strict';
import { test } from 'node:test';

import redirect, { config } from './index.ts';

const location = (path: string) => {
  const response = redirect(new Request(`https://lynxjs.org${path}`));
  if (!response) return undefined;
  assert.equal(response.status, 301);
  const url = new URL(response.headers.get('location')!);
  return decodeURIComponent(url.pathname) + url.search + url.hash;
};

test('redirects old API URLs', () => {
  assert.equal(
    location('/api/react/Function.useInitData'),
    '/api/react/Hooks/useInitData',
  );
  assert.equal(
    location('/api/lynx-testing-environment/index.html'),
    '/api/packages/testing-environment',
  );
  // A page the reference still publishes is not redirected to itself.
  assert.equal(
    location('/next/api/genui/openui/explicit/functions/createOpenUiLibrary'),
    undefined,
  );
});

test('leaves archived Rspeedy API URLs to the Netlify redirects', () => {
  const pattern = new RegExp(config.pattern);
  for (const prefix of ['', '/zh', '/next', '/next/zh']) {
    for (const page of ['', '/index', '/rspeedy.config.mode']) {
      for (const extension of ['', '.html', '.md']) {
        const path = `${prefix}/api/rspeedy${page}${extension}`;
        assert.ok(!pattern.test(path));
        assert.equal(location(path), undefined);
      }
    }
  }
});

test('keeps locale and version prefixes', () => {
  assert.equal(
    location('/next/zh/api/react/Function.useInitData.html'),
    '/next/zh/api/react/Hooks/useInitData',
  );
  // TypeDoc names the kind directories of a localized page in its language.
  assert.equal(
    location('/zh/api/reactlynx-testing-library/Function.render'),
    '/zh/api/react/testing-library/函数/render',
  );
});

test('points a member at the kind it has today', () => {
  assert.equal(
    location('/api/reactlynx-testing-library/Variable.act'),
    '/api/react/testing-library/Functions/act',
  );
  assert.equal(
    location('/api/reactlynx-testing-library/Function.createEvent'),
    '/api/react/testing-library/Variables/createEvent',
  );
  assert.equal(
    location('/api/genui/a2ui/functions/A2UI'),
    '/api/genui/a2ui/variables/A2UI',
  );
});

test('keeps the query string', () => {
  assert.equal(
    location('/api/react/Function.useInitData.html?utm_source=x'),
    '/api/react/Hooks/useInitData?utm_source=x',
  );
});

test('leaves current pages alone', () => {
  assert.equal(location('/api/react/Hooks/useInitData'), undefined);
  const pattern = new RegExp(config.pattern);
  assert.ok(pattern.test('/next/zh/api/react/Function.useInitData.html'));
  assert.ok(!pattern.test('/api/react/Hooks/useInitData'));
  assert.ok(!pattern.test('/zh/api/packages/rspeedy'));
});
