import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  apiPackageSubsites,
  findSubsiteValue,
} from './shared-subsite-routes.ts';

const packages = [
  { route: 'api/packages/rspeedy', group: 'Build tools' },
  { route: 'api/packages/rsbuild-plugin', group: 'Build tools' },
  { route: 'api/packages/web-core', group: 'Web platform' },
  { route: 'api/react', group: 'Libraries and tools' },
];

const subsiteOf = (pathname: string) =>
  findSubsiteValue(pathname, {
    subsites: ['guide', 'build', 'react', 'ui', 'lynxtron'],
    packageSubsites: apiPackageSubsites(packages),
  });

test('package pages keep the subsite of their group', () => {
  assert.equal(subsiteOf('/api/packages/rspeedy'), 'build');
  assert.equal(subsiteOf('/api/packages/rsbuild-plugin'), 'build');
  // A member page is the same package.
  assert.equal(
    subsiteOf('/api/packages/rsbuild-plugin/functions/isPluginLynxRegistered'),
    'build',
  );
  assert.equal(subsiteOf('/api/packages/rspeedy/interfaces/Config'), 'build');
  assert.equal(subsiteOf('/api/packages/web-core'), undefined);
  assert.equal(subsiteOf('/api/packages/'), undefined);
});

// lynxjs.org serves both testing packages under the Lynx guide today.
test('the testing pages keep the guide', () => {
  assert.equal(subsiteOf('/api/react/testing-library'), 'guide');
  assert.equal(
    subsiteOf('/api/react/testing-library/Classes/LynxTestingEnv'),
    'guide',
  );
  assert.equal(
    subsiteOf('/zh/api/packages/testing-environment/classes/LynxTestingEnv'),
    undefined,
  );
});

test('config and ReactLynx routes keep their subsite', () => {
  assert.equal(subsiteOf('/api/build/mode'), 'build');
  assert.equal(subsiteOf('/api/build/'), 'build');
  assert.equal(subsiteOf('/api/react/hooks'), 'react');
});

test('version and language prefixes and .html suffixes', () => {
  assert.equal(subsiteOf('/next/api/packages/rspeedy.html'), 'build');
  assert.equal(subsiteOf('/4.0/api/packages/rsbuild-plugin'), 'build');
  assert.equal(subsiteOf('/zh/api/packages/rspeedy'), 'build');
  assert.equal(subsiteOf('/next/zh/api/build/mode.html'), 'build');
  assert.equal(subsiteOf('/next/zh/api/react/hooks'), 'react');
});

test('other routes still match a path segment', () => {
  assert.equal(subsiteOf('/guide/start/quick-start'), 'guide');
  assert.equal(subsiteOf('/zh/build/cli.html'), 'build');
  assert.equal(subsiteOf('/ui/introduction'), 'ui');
  assert.equal(subsiteOf('/lynx-ui/introduction'), 'ui');
  assert.equal(subsiteOf('/api/genui/openui'), undefined);
});
