/**
 * CI contract between the theme-owned API package classification and the
 * installed Lynx Stack docs manifest.
 *
 * API_PACKAGE_SUBSITES is an exception map: packages absent from it correctly
 * fall back to the guide. The contract is therefore intentionally one-way.
 * Every mapped package must still exist upstream, but not every manifest
 * package needs a mapping.
 *
 * Keep this check outside sync-lynx-stack-docs.mjs so document generation
 * remains driven only by the manifest and filesystem inputs.
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { API_PACKAGE_SUBSITES } from '../../theme/utils/subsite-routes.ts';

const manifest = createRequire(import.meta.url)(
  '@lynx-js/lynx-stack-docs/manifest.json',
);

test('theme package subsite mappings refer to manifest packages', () => {
  const packageRoutes = new Set(manifest.packages.map(({ route }) => route));
  const staleMappings = Object.keys(API_PACKAGE_SUBSITES).filter(
    (name) => !packageRoutes.has(`api/packages/${name}`),
  );

  assert.deepEqual(
    staleMappings,
    [],
    'remove or update package subsite mappings absent from the Lynx Stack docs manifest',
  );
});
