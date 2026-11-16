// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import assert from 'node:assert/strict';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { syncSkillsDocs } from './sync-skills-docs.mjs';

const require = createRequire(import.meta.url);
const source =
  process.env.SKILLS_DOCS_SOURCE ??
  dirname(require.resolve('@lynx-js/skills-docs/manifest.json'));

test('the website adapter consumes the installed ownership contract and preserves authored sources', (t) => {
  const website = mkdtempSync(join(tmpdir(), 'website-skills-'));
  t.after(() => rmSync(website, { recursive: true, force: true }));
  const pkg = join(website, 'node_modules/@lynx-js/skills-docs');
  cpSync(source, pkg, { recursive: true });
  writeFileSync(join(website, 'package.json'), '{}');
  for (const locale of ['en', 'zh']) {
    const ai = join(website, 'docs', locale, 'ai');
    mkdirSync(join(ai, 'skills'), { recursive: true });
    writeFileSync(
      join(ai, '_meta.template.json'),
      JSON.stringify([{ external: 'agent-lynx' }, { external: 'skills' }]),
    );
    writeFileSync(
      join(ai, 'skills/_meta.site.json'),
      JSON.stringify([{ name: 'website.mdx', sidebar: false }]),
    );
    writeFileSync(join(ai, 'skills/website.mdx'), '# Website source');
  }
  const result = syncSkillsDocs({ website, source: pkg });
  for (const locale of ['en', 'zh']) {
    const ai = join(website, 'docs', locale, 'ai');
    assert.equal(
      readFileSync(join(ai, 'skills/website.mdx'), 'utf8'),
      '# Website source',
    );
    assert.ok(
      Object.hasOwn(result.websiteFiles, `${locale}/ai/skills/website.mdx`),
    );
    const navigation = JSON.parse(readFileSync(join(ai, '_meta.json'), 'utf8'));
    assert.ok(!navigation.some((entry) => entry.name === 'skills/website.mdx'));
    const packaged = JSON.parse(
      readFileSync(
        join(pkg, 'content', locale, 'ai/agent-lynx/_meta.json'),
        'utf8',
      ),
    );
    assert.deepEqual(
      navigation.filter((entry) => entry.name?.startsWith('agent-lynx/')),
      packaged.map((entry) => ({ ...entry, name: `agent-lynx/${entry.name}` })),
    );
  }
});
