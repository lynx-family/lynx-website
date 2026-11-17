// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { watch } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncWebsite } from './skills-docs.mjs';

const WEBSITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function syncSkillsDocs({ website = WEBSITE, source } = {}) {
  website = resolve(website);
  const require = createRequire(join(website, 'package.json'));
  source = resolve(
    source ??
      process.env.SKILLS_DOCS_SOURCE ??
      dirname(require.resolve('@lynx-js/skills-docs/manifest.json')),
  );
  const inventory = syncWebsite({ website, source });
  return { source, sections: ['ai/agent-lynx', 'ai/skills'], ...inventory };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const source = args.find((arg) => arg !== '--watch');
  const result = syncSkillsDocs({ source });
  console.log(`Synced ${result.sections.join(', ')} from ${result.source}`);
  if (args.includes('--watch')) {
    let timer;
    watch(result.source, { recursive: true }, (_event, filename) => {
      const name = filename?.toString().split(sep).join('/');
      if (name && name !== 'manifest.json' && !/^(content|public)\//.test(name))
        return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          syncSkillsDocs({ source: result.source });
          console.log(`Updated ${relative(WEBSITE, result.source)}`);
        } catch (error) {
          console.error(error);
        }
      }, 100);
    });
    console.log('Watching skills documentation sources.');
  }
}
