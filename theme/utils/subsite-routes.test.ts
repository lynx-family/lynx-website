/**
 * Pure behavior tests for the theme-owned route classifier.
 *
 * These cases intentionally use only synthetic pathnames. Whether mapped API
 * packages still exist in the installed Lynx Stack docs manifest is a separate
 * CI contract, and whether the sync script runs after packaging is covered by
 * its installed-package regression.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findSubsiteValue } from './subsite-routes.ts';

const subsiteOf = (pathname: string) =>
  findSubsiteValue(pathname, ['guide', 'react', 'ui', 'lynxtron']);

// The build documentation is part of the Lynx guide.
test('other package pages and the build configuration keep the guide', () => {
  assert.equal(subsiteOf('/api/packages/rspeedy'), undefined);
  assert.equal(
    subsiteOf('/api/packages/rsbuild-plugin/functions/isPluginLynxRegistered'),
    undefined,
  );
  assert.equal(subsiteOf('/api/packages/web-core'), undefined);
  assert.equal(subsiteOf('/api/packages/'), undefined);
  assert.equal(subsiteOf('/api/build/mode'), undefined);
  assert.equal(subsiteOf('/api/build/'), undefined);
  // A package name that only starts like a ReactLynx one.
  assert.equal(subsiteOf('/api/packages/react-rsbuild-plugin'), undefined);
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

test('ReactLynx routes keep their subsite', () => {
  assert.equal(subsiteOf('/api/react'), 'react');
  assert.equal(subsiteOf('/api/react/Hooks/useState'), 'react');
});

test('version and language prefixes and .html suffixes', () => {
  assert.equal(subsiteOf('/next/api/react.html'), 'react');
  assert.equal(subsiteOf('/4.0/api/react/Hooks/useState'), 'react');
  assert.equal(subsiteOf('/zh/api/react'), 'react');
  assert.equal(subsiteOf('/next/zh/api/react/Hooks/useState.html'), 'react');
  assert.equal(subsiteOf('/next/zh/api/build/mode.html'), undefined);
});

test('other routes still match a path segment', () => {
  assert.equal(subsiteOf('/guide/start/quick-start'), 'guide');
  assert.equal(subsiteOf('/zh/react/introduction.html'), 'react');
  assert.equal(subsiteOf('/ui/introduction'), 'ui');
  assert.equal(subsiteOf('/lynx-ui/introduction'), 'ui');
  assert.equal(subsiteOf('/api/genui/openui'), undefined);
});
