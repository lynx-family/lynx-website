import assert from 'node:assert/strict';
import test from 'node:test';

import { isCurrentDocPath } from './links';

test('matches extensionless documentation routes to .html pages', () => {
  assert.equal(
    isCurrentDocPath(
      '/next/api/css/properties/max-width.html',
      'api/css/properties/max-width',
    ),
    true,
  );
});

test('matches index pages and ignores URL fragments', () => {
  assert.equal(
    isCurrentDocPath(
      '/next/api/lynx-api/main-thread/index.html',
      'api/lynx-api/main-thread#element',
    ),
    true,
  );
});

test('does not match a different documentation route', () => {
  assert.equal(
    isCurrentDocPath('/next/api/status', 'api/css/properties/max-width'),
    false,
  );
});
