import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoApiPartialRoutes,
  isApiPartialRoute,
} from './api-partial-routes.mts';

test('identifies localized built-in API partial routes', () => {
  assert.equal(isApiPartialRoute('/api/elements/built-in/video-API'), true);
  assert.equal(
    isApiPartialRoute('/zh/api/elements/built-in/scroll-view-API'),
    true,
  );
  assert.equal(isApiPartialRoute('/fr/api/elements/built-in/image-API'), true);
});

test('ignores canonical pages and unrelated API suffixes', () => {
  assert.equal(isApiPartialRoute('/api/elements/built-in/video'), false);
  assert.equal(isApiPartialRoute('/api/packages/example-API'), false);
  assert.equal(
    isApiPartialRoute('/archive/en/api/elements/built-in/video-API'),
    false,
  );
  assert.equal(isApiPartialRoute('/api/elements/built-in/-API'), false);
});

test('reports every generated API partial route in stable order', () => {
  assert.throws(
    () =>
      assertNoApiPartialRoutes([
        '/zh/api/elements/built-in/video-API',
        '/api/elements/built-in/image',
        '/api/elements/built-in/image-API',
      ]),
    {
      message:
        'API-only built-in partials must not generate standalone routes:\n' +
        '- /api/elements/built-in/image-API\n' +
        '- /zh/api/elements/built-in/video-API',
    },
  );
});
