#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const headings = { en: 'Example', zh: '示例' };

// Lynx Go examples appended to the ReactLynx reference pages synced from
// lynx-stack. Runs right after the sync, so each page is fresh.
const examples = {
  'api/react/Functions/cloneElement.mdx': 'src/clone-element',
  'api/react/Functions/createElement.mdx': 'src/create-element',
  'api/react/Functions/createPortal.mdx': 'src/create-portal',
};

for (const [page, entry] of Object.entries(examples)) {
  for (const [locale, heading] of Object.entries(headings)) {
    const file = `${repoRoot}docs/${locale}/${page}`;
    const content = await readFile(file, 'utf8');
    const name = entry.slice('src/'.length);
    await writeFile(
      file,
      `import * as Lynx from '@lynx';

${content.trimEnd()}

## ${heading}

<Lynx.Go
  example="react-apis"
  defaultFile="${entry}/index.tsx"
  defaultEntryFile="dist/${name}.lynx.bundle"
  entry="${entry}"
  defaultTab="web"
/>
`,
    );
    console.log(`Added the Lynx Go example to docs/${locale}/${page}`);
  }
}
