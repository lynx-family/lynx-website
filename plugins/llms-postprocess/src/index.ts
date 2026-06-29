import type { RspressPlugin } from '@rspress/core';
import path from 'node:path';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';

import { postprocessLLMs } from './postprocess';

function pluginLLMsPostprocess(): RspressPlugin {
  return {
    name: 'rspress-plugin-llms-postprocess',
    async afterBuild({ llms, ...config }, isProd: boolean) {
      if (llms && isProd) {
        const { outDir = 'doc_build' } = config;
        const cwd = process.cwd();
        const roots = [path.join(cwd, outDir), path.join(cwd, outDir, 'zh')];

        for (const root of roots) {
          const llmsTxtPath = path.join(root, 'llms.txt');
          const agentsMDPath = path.join(root, 'AGENTS.md');
          if (
            existsSync(llmsTxtPath) === false ||
            existsSync(agentsMDPath) === false
          ) {
            continue;
          }

          const llmsTxt = await fs.readFile(llmsTxtPath, 'utf-8');
          const agentsMD = await fs.readFile(agentsMDPath, 'utf-8');

          const result = postprocessLLMs(
            'https://lynxjs.org',
            config.base ?? '',
            llmsTxt,
            agentsMD,
          );

          for (const [filePath, content] of Object.entries(result)) {
            const pp = path.join(root, filePath);
            await fs.writeFile(pp, content);
          }
        }
      }
    },
  };
}

export { pluginLLMsPostprocess };
