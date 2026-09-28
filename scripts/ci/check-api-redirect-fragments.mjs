// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import redirect from '../../netlify/edge-functions/lynx-stack-api-redirects/index.ts';

const outDir = path.resolve(process.argv[2] ?? 'doc_build');
const legacy = JSON.parse(
  readFileSync(
    new URL(
      '../../netlify/edge-functions/lynx-stack-api-redirects/legacy.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

const idsByPage = new Map();
function headingIds(route) {
  if (!idsByPage.has(route)) {
    const file = [`${route}.html`, `${route}/index.html`]
      .map((name) => path.join(outDir, name))
      .find((name) => existsSync(name));
    idsByPage.set(
      route,
      file
        ? new Set(
            [...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(
              (match) => match[1],
            ),
          )
        : undefined,
    );
  }
  return idsByPage.get(route);
}

// URLs the function answers by rule rather than from the table, one per
// branch, so a change to the generated layout is caught here too.
const BY_RULE = [
  '/api/lynx-testing-environment/Class.LynxTestingEnv',
  '/api/lynx-testing-environment/Interface.LynxElement',
  '/api/lynx-testing-environment/TypeAlias.ElementTreeGlobals',
  '/api/lynx-testing-environment/Function.initElementTree',
  '/api/reactlynx-testing-library/index',
  '/api/genui/a2ui/index',
];

// The edge function itself answers where an old URL goes, so a locale that
// spells a directory its own way is checked the way a reader sees it.
const errors = [];
for (const from of [...Object.keys(legacy), ...BY_RULE]) {
  for (const prefix of ['', '/zh']) {
    const response = redirect(
      new Request(`https://lynxjs.org${prefix}${from}`),
    );
    if (!response) {
      errors.push(`${prefix}${from}: not redirected`);
      continue;
    }
    const location = new URL(response.headers.get('location'));
    const to = decodeURIComponent(location.pathname);
    const fragment = location.hash.slice(1);
    const ids = headingIds(to.replace(/\/$/, '/index'));
    if (!ids) {
      errors.push(`${prefix}${from} -> ${to}: page not found`);
    } else if (fragment && !ids.has(fragment)) {
      errors.push(`${prefix}${from} -> ${to}#${fragment}: heading not found`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Checked ${(Object.keys(legacy).length + BY_RULE.length) * 2} API redirects.`,
);
