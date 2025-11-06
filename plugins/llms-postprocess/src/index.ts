import type { RspressPlugin } from '@rspress/core';
import path from 'node:path';
import fs from 'node:fs/promises';

import { postprocessLLMs } from './postprocess';

function pluginLLMsPostprocess(): RspressPlugin {
  return {
    name: 'rspress-plugin-llms-postprocess',
    async afterBuild({ llms, ...config }) {
      if (llms) {
        const { outDir = 'doc_build' } = config;
        const cwd = process.cwd();
        const roots = [path.join(cwd, outDir), path.join(cwd, outDir, 'zh')];

        for (const root of roots) {
          const llmsTxt = await fs.readFile(
            path.join(root, 'llms.txt'),
            'utf-8',
          );
          const agentsMD = await fs.readFile(
            path.join(root, 'AGENTS.md'),
            'utf-8',
          );

          const result = postprocessLLMs(llmsTxt, agentsMD);

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
