// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const netlifyConfig = await readFile(
  new URL('../../netlify.toml', import.meta.url),
  'utf8',
);
const rspressConfig = await readFile(
  new URL('../../rspress.config.ts', import.meta.url),
  'utf8',
);
const routeConfig = await readFile(
  new URL('../../shared-route-config.ts', import.meta.url),
  'utf8',
);

function assertNetlifyRedirect(from, to) {
  const block = [
    '[[redirects]]',
    `  from = "${from}"`,
    `  to = "${to}"`,
    '  status = 301',
    '  force = true',
  ].join('\n');

  assert.ok(
    netlifyConfig.includes(block),
    `Missing permanent redirect: ${from} -> ${to}`,
  );
}

assert.match(routeConfig, /home: '\/ui\/'/);
assert.match(routeConfig, /url: '\/ui\/introduction'/);

for (const [from, to] of [
  ['/lynx-ui/*', '/4.1/ui/:splat'],
  ['/zh/lynx-ui/*', '/4.1/zh/ui/:splat'],
  ['/4.1/lynx-ui/*', '/4.1/ui/:splat'],
  ['/4.1/zh/lynx-ui/*', '/4.1/zh/ui/:splat'],
  ['/next/lynx-ui/*', '/next/ui/:splat'],
  ['/next/zh/lynx-ui/*', '/next/zh/ui/:splat'],
  ['/3.8/ui', '/3.8/lynx-ui/'],
  ['/3.8/ui/*', '/3.8/lynx-ui/:splat'],
  ['/3.8/zh/ui', '/3.8/zh/lynx-ui/'],
  ['/3.8/zh/ui/*', '/3.8/zh/lynx-ui/:splat'],
  ['/3.9/lynx-ui', '/3.9/ui/'],
  ['/3.9/lynx-ui/*', '/3.9/ui/:splat'],
  ['/3.9/zh/lynx-ui', '/3.9/zh/ui/'],
  ['/3.9/zh/lynx-ui/*', '/3.9/zh/ui/:splat'],
]) {
  assertNetlifyRedirect(from, to);
}

assert.match(rspressConfig, /from: '\^\/lynx-ui\(\/\.\*\)\?\$'/);
assert.match(rspressConfig, /from: '\^\/zh\/lynx-ui\(\/\.\*\)\?\$'/);

// The production proxy removes /4.1 before reaching this branch. Check both
// origin paths and direct, version-prefixed branch URLs against the same target.
for (const lang of ['', '/zh']) {
  for (const tutorial of ['gallery', 'product-detail']) {
    const from = `${lang}/guide/start/tutorial-${tutorial}*`;
    const to = `/4.1${lang}/learn/${tutorial}:splat`;
    assertNetlifyRedirect(from, to);
    assertNetlifyRedirect(`/4.1${from}`, to);
  }
  for (const subsite of ['ai', 'react', 'rspeedy', 'lynx-ui']) {
    const from = `${lang}/${subsite}/start/*`;
    const to = `/4.1${lang}/guide/start/:splat`;
    assertNetlifyRedirect(from, to);
    assertNetlifyRedirect(`/4.1${from}`, to);
  }
  for (const prefix of ['', '/4.1']) {
    const specific = `  from = "${prefix}${lang}/lynx-ui/start/*"`;
    const general = `  from = "${prefix}${lang}/lynx-ui/*"`;
    assert.ok(
      netlifyConfig.indexOf(specific) < netlifyConfig.indexOf(general),
      `Quick Start redirect must precede the UI wildcard: ${specific}`,
    );
  }
}

console.log('lynx-ui and archived release route contract checks passed.');
