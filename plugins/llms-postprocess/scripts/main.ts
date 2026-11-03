import { postprocessLLMs } from '../src/postprocess.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// This is a manual comparison tool, not the Rspress plugin entrypoint. Require
// the build base so it cannot silently emit links for another docs version.
const { values } = parseArgs({
  options: {
    base: {
      type: 'string',
    },
  },
});
const base = requireBase(values.base);

function requireBase(value: string | undefined): string {
  if (!value) {
    throw new Error('Missing required --base <path>. Example: --base /next');
  }
  return value;
}

async function main() {
  const roots = [
    path.resolve(__dirname, '../../../doc_build'),
    path.resolve(__dirname, '../../../doc_build/zh'),
  ];

  for (const root of roots) {
    const llmsTxt = await fs.readFile(path.join(root, 'llms.txt'), 'utf-8');
    const agentsMD = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf-8');

    // do backup
    await fs.copyFile(
      path.join(root, 'llms.txt'),
      path.join(root, 'llms.txt.bak'),
    );

    const result = postprocessLLMs(
      'https://lynxjs.org',
      base,
      llmsTxt,
      agentsMD,
    );

    for (const [filePath, content] of Object.entries(result)) {
      const pp = path.join(root, filePath);
      console.log('Overwriting:', pp);
      await fs.writeFile(pp + '.2', content);
    }
  }
}

main();
