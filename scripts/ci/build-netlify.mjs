import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const rspressBin = path.join(
  repoRoot,
  'node_modules',
  '@rspress',
  'core',
  'bin',
  'rspress.js',
);
const llmsBuildDir = path.join(repoRoot, '.rspress-llms-build');
const outputDir = path.join(repoRoot, 'doc_build');
const isLightweightBuild =
  process.env.RSPRESS_LIGHTWEIGHT_BUILD === 'true' ||
  process.env.CONTEXT === 'deploy-preview';

async function run(command, args, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(' ')} failed (${signal ?? `exit ${code}`})`,
        ),
      );
    });
  });
}

async function collectLlmsFiles(dir, root = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectLlmsFiles(absolutePath, root);
      if (!entry.isFile()) return [];
      if (
        entry.name.endsWith('.md') ||
        /^llms(?:-full)?\.txt$/.test(entry.name)
      ) {
        return [path.relative(root, absolutePath)];
      }
      return [];
    }),
  );
  return files.flat();
}

async function mergeLlmsOutput() {
  const files = await collectLlmsFiles(llmsBuildDir);
  for (const relativePath of files) {
    const source = path.join(llmsBuildDir, relativePath);
    const target = path.join(outputDir, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
  console.log(`[netlify] merged ${files.length} Markdown/LLM files`);
}

async function main() {
  await run(process.execPath, ['scripts/ci/check-build-prereqs.mjs']);
  await run('pnpm', ['gen:og']);

  const commonBuildEnv = {
    NODE_OPTIONS: '--max-old-space-size=3072',
    RSPRESS_SSG_WORKER_THREAD_COUNT: '1',
  };

  await run(process.execPath, [rspressBin, 'build'], {
    ...commonBuildEnv,
    RSPRESS_BUILD_PHASE: 'site',
  });

  if (isLightweightBuild) return;

  await fs.rm(llmsBuildDir, { force: true, recursive: true });
  await run(process.execPath, [rspressBin, 'build'], {
    ...commonBuildEnv,
    RSPRESS_BUILD_PHASE: 'llms',
  });
  await mergeLlmsOutput();
  await fs.rm(llmsBuildDir, { force: true, recursive: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
