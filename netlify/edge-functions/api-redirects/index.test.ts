import assert from 'node:assert/strict';
import { test } from 'node:test';

import redirect, { config } from './index.ts';

const location = (path: string) => {
  const response = redirect(new Request(`https://lynxjs.org${path}`));
  if (!response) return undefined;
  assert.equal(response.status, 301);
  const url = new URL(response.headers.get('location')!);
  return url.pathname + url.search + url.hash;
};

test('redirects old API URLs', () => {
  assert.equal(
    location('/api/react/Function.useInitData'),
    '/api/react/hooks#useinitdata',
  );
  assert.equal(location('/api/rspeedy/'), '/api/config/');
  assert.equal(
    location('/api/lynx-testing-environment/index.html'),
    '/api/packages/testing-environment',
  );
  assert.equal(
    location('/next/api/genui/openui/explicit/functions/createOpenUiLibrary'),
    '/next/api/genui/openui-explicit#createopenuilibrary',
  );
});

test('keeps locale and version prefixes', () => {
  assert.equal(
    location('/next/zh/api/rspeedy/rspeedy.config.mode.html'),
    '/next/zh/api/config/mode',
  );
  assert.equal(
    location('/zh/api/reactlynx-testing-library/Function.render'),
    '/zh/api/react/testing-library#render',
  );
});

test('keeps the query string', () => {
  assert.equal(
    location('/api/react/Function.useInitData.html?utm_source=x'),
    '/api/react/hooks?utm_source=x#useinitdata',
  );
});

test('leaves current pages alone', () => {
  assert.equal(location('/api/react/hooks'), undefined);
  const pattern = new RegExp(config.pattern);
  assert.ok(pattern.test('/next/zh/api/rspeedy/rspeedy.config.mode.html'));
  assert.ok(!pattern.test('/api/react/hooks'));
  assert.ok(!pattern.test('/zh/api/packages/rspeedy'));
});
