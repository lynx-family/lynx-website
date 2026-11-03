# Lynx LLM indexes

Use Rspress's `llms.llmsTxt` option to compose the root index from the
locale's source `AGENTS.md` and Rspress's structured page sections:

```ts
import { createLynxLlms } from '@lynx-js/rspress-plugin-llms-postprocess';
import { defineConfig } from '@rspress/core';
import path from 'node:path';

const { llmsTxt, apiIndexPlugin } = createLynxLlms({
  publicDir: path.resolve('docs/public'),
  siteOrigin: 'https://lynxjs.org',
});

export default defineConfig({
  lang: 'en',
  llms: { llmsTxt },
  plugins: [apiIndexPlugin],
});
```

The callback preserves the introductory content, filters appendix links,
and limits appendix descriptions to 30 tokens. Page links come from
Rspress, including its deployment base, language, and version. Both English
and Chinese indexes link to their corresponding API indexes.

The plugin only writes the extra `api/llms.txt` files after a production
build. Rspress owns the root `llms.txt`, `llms-full.txt`, and page Markdown
outputs. Configure both the callback and the plugin together. `publicDir`
must contain `AGENTS.md` for the default language and
`<lang>/AGENTS.md` for each additional language.

The existing `pluginLLMsPostprocess` export is retained for consumers using
the previous build configuration. Migrate by replacing that plugin with
the callback and API index plugin above; do not enable both approaches.
