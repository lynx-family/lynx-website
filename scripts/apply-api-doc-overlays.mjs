#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

// Explain the two Lynx configuration categories at the website boundary.
// Generated API sources remain owned by lynx-stack.
const configCopy = {
  en: {
    addedTag: 'Lynx-only',
    overrideTag: 'Default override',
    rspeedyTag: 'Rspeedy-only',
    addedTitle: 'Lynx-specific option',
    overrideTitle: 'Lynx default override',
    rspeedyTitle: 'Rspeedy-only option',
    added:
      'This option is added by `pluginLynx`, rather than Rsbuild. In `rsbuild.config.ts`, pass it to `pluginLynx({ ... })`.',
    override:
      'This is an Rsbuild option whose default is overridden by `pluginLynx`. The default shown below applies when using the plugin. Set this option at the top level of `rsbuild.config.ts`; an explicit value takes precedence.',
    rspeedy:
      'This option is only accepted by Rspeedy in `lynx.config.ts`. It is not supported by Rsbuild with `pluginLynx`; do not copy it into `rsbuild.config.ts` or pass it to `pluginLynx()`.',
    reference: 'See the Rsbuild reference for the full option behavior',
    addedHeading: '## Lynx-specific options',
    overrideHeading: '## Lynx default overrides',
    rspeedyHeading: '## Rspeedy-only options',
  },
  zh: {
    addedTag: 'Lynx 新增',
    overrideTag: '默认值覆盖',
    rspeedyTag: '仅 Rspeedy',
    addedTitle: 'Lynx 新增配置',
    overrideTitle: 'Lynx 默认值覆盖',
    rspeedyTitle: '仅适用于 Rspeedy',
    added:
      '此配置由 `pluginLynx` 新增，不属于 Rsbuild 配置。在 `rsbuild.config.ts` 中，将它传给 `pluginLynx({ ... })`。',
    override:
      '此项是 Rsbuild 配置，`pluginLynx` 覆盖了它的默认值。下方默认值指应用插件后的值。请在 `rsbuild.config.ts` 顶层配置，显式设置的值优先。',
    rspeedy:
      '此配置仅由 Rspeedy 的 `lynx.config.ts` 接受，Rsbuild + `pluginLynx` 不支持。请勿直接写入 `rsbuild.config.ts`，也不要传给 `pluginLynx()`。',
    reference: '完整行为见 Rsbuild 配置参考',
    addedHeading: '## Lynx 新增配置',
    overrideHeading: '## Lynx 默认值覆盖',
    rspeedyHeading: '## 仅适用于 Rspeedy',
  },
};

for (const [locale, copy] of Object.entries(configCopy)) {
  const root = `${repoRoot}docs/${locale}/api/build`;
  let count = 0;
  for (const entry of await readdir(root, { recursive: true })) {
    if (!entry.endsWith('_meta.json')) continue;
    const metaFile = join(root, entry);
    const meta = JSON.parse(await readFile(metaFile, 'utf8'));
    for (const item of meta) {
      const added = item.tag === 'Lynx';
      const override = ['Default changed', '默认值已变更'].includes(item.tag);
      const rspeedy = item.tag === 'Rspeedy';
      if (!added && !override && !rspeedy) continue;
      item.tag = added
        ? copy.addedTag
        : override
          ? copy.overrideTag
          : copy.rspeedyTag;
      const page = join(dirname(metaFile), `${item.name}.mdx`);
      let content = await readFile(page, 'utf8');
      const option = content.match(/^# (.+)$/m)?.[1];
      if (!option) throw new Error(`Missing configuration heading: ${page}`);
      const slug =
        option === 'output.filename.css'
          ? 'output/filename'
          : option
              .split('.')
              .map((part) =>
                part.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
              )
              .join('/');
      const rsbuild = `https://rsbuild.rs/${locale === 'zh' ? 'zh/' : ''}config/${slug}`;
      const title = added
        ? copy.addedTitle
        : override
          ? copy.overrideTitle
          : copy.rspeedyTitle;
      const description = added
        ? copy.added
        : override
          ? copy.override
          : copy.rspeedy;
      const notice = `:::info ${title}\n${description}\n${override ? `\n[${copy.reference}](${rsbuild})${locale === 'zh' ? '。' : '.'}\n` : ''}:::`;
      // Replace the raw TSDoc modifier instead of displaying it as a code chip.
      if (override) {
        if (!content.includes('**`Lynx Default Changed`**')) {
          throw new Error(`Missing default override marker: ${page}`);
        }
        content = content.replace('**`Lynx Default Changed`**', notice);
      } else {
        // The generated signature can span several lines.
        content = content.replace(
          /(^>[^\n]*(?:\n>[^\n]*)*)/m,
          `$1\n\n${notice}`,
        );
      }
      await writeFile(page, content);
      count++;
    }
    await writeFile(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  }
  const overviewFile = join(root, 'index.mdx');
  let overview = await readFile(overviewFile, 'utf8');
  overview = overview
    .replace(/^## Lynx$/m, copy.addedHeading)
    .replace(/^## (Default changed|默认值已变更)$/m, copy.overrideHeading)
    .replace(/^## Rspeedy$/m, copy.rspeedyHeading);
  await writeFile(overviewFile, overview);
  console.log(`Clarified ${count} Lynx configuration labels (${locale})`);
}

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
  defaultEntryName="${name}"
  entry="${entry}"
  defaultTab="web"
/>
`,
    );
    console.log(`Added the Lynx Go example to docs/${locale}/${page}`);
  }
}
