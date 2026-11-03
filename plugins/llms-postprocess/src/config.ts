import type { LlmsTxtRenderer, RspressPlugin } from '@rspress/core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { indexPrefix, renderLynxLlms } from './render';

/** Compose llms.txt through Rspress; the plugin only emits extra API indexes. */
export function createLynxLlms(options: {
  publicDir: string;
  siteOrigin: string;
}) {
  let defaultLang = 'en';
  let defaultVersion = '';
  const apiIndexes = new Map<string, string>();
  const llmsTxt: LlmsTxtRenderer = async (context) => {
    const agentsMD = await fs.readFile(
      path.join(
        options.publicDir,
        context.lang === defaultLang ? '' : context.lang,
        'AGENTS.md',
      ),
      'utf8',
    );
    const prefix = indexPrefix(
      context.lang,
      context.version,
      defaultLang,
      defaultVersion,
    );
    const { llmsTxt, apiIndex } = renderLynxLlms(context, agentsMD, {
      defaultLang,
      defaultVersion,
      siteOrigin: options.siteOrigin,
    });
    if (apiIndex) apiIndexes.set(`${prefix}api/llms.txt`, apiIndex);
    return llmsTxt;
  };
  const apiIndexPlugin: RspressPlugin = {
    name: 'lynx-api-llms-index',
    beforeBuild(config) {
      defaultLang = config.lang ?? '';
      defaultVersion = config.multiVersion?.default ?? '';
      apiIndexes.clear();
    },
    async afterBuild(config, isProd) {
      if (!isProd || !config.llms) return;
      const outDir = path.resolve(config.outDir ?? 'doc_build');
      for (const [file, content] of apiIndexes) {
        const destination = path.join(outDir, file);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, content);
      }
    },
  };
  return { llmsTxt, apiIndexPlugin };
}
