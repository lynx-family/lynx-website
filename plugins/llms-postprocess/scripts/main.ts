import { postprocessLLMs } from '../src/postprocess.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
      '/3.5',
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
