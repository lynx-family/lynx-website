import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  apiPackageSubsites,
  findSubsiteValue,
} from './shared-subsite-routes.ts';

const groups = [
  {
    group: 'Build tools',
    packages: ['@lynx-js/rspeedy', '@lynx-js/rsbuild-plugin'],
  },
  { group: 'Web platform', packages: ['@lynx-js/web-core'] },
];

const subsiteOf = (pathname: string) =>
  findSubsiteValue(pathname, {
    subsites: ['guide', 'rspeedy', 'react', 'ui', 'lynxtron'],
    packageSubsites: apiPackageSubsites(groups),
  });

test('package pages keep the subsite of their group', () => {
  assert.equal(subsiteOf('/api/packages/rspeedy'), 'rspeedy');
  assert.equal(subsiteOf('/api/packages/rsbuild-plugin'), 'rspeedy');
  assert.equal(subsiteOf('/api/packages/web-core'), undefined);
  assert.equal(subsiteOf('/api/packages/'), undefined);
});

test('config and ReactLynx routes keep their subsite', () => {
  assert.equal(subsiteOf('/api/config/mode'), 'rspeedy');
  assert.equal(subsiteOf('/api/config/'), 'rspeedy');
  assert.equal(subsiteOf('/api/react/hooks'), 'react');
});

test('version and language prefixes and .html suffixes', () => {
  assert.equal(subsiteOf('/next/api/packages/rspeedy.html'), 'rspeedy');
  assert.equal(subsiteOf('/4.0/api/packages/rsbuild-plugin'), 'rspeedy');
  assert.equal(subsiteOf('/zh/api/packages/rspeedy'), 'rspeedy');
  assert.equal(subsiteOf('/next/zh/api/config/mode.html'), 'rspeedy');
  assert.equal(subsiteOf('/next/zh/api/react/hooks'), 'react');
});

test('other routes still match a path segment', () => {
  assert.equal(subsiteOf('/guide/start/quick-start'), 'guide');
  assert.equal(subsiteOf('/zh/rspeedy/cli.html'), 'rspeedy');
  assert.equal(subsiteOf('/ui/introduction'), 'ui');
  assert.equal(subsiteOf('/lynx-ui/introduction'), 'ui');
  assert.equal(subsiteOf('/api/genui/openui'), undefined);
});
