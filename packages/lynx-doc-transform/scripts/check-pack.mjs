import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
);
const temporary = mkdtempSync(
  path.join(os.tmpdir(), 'lynx-doc-transform-pack-'),
);
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
let completed = false;

function run(label, command, args, cwd = temporary) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  const log = path.join(temporary, `${label}.log`);
  writeFileSync(log, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  assert.equal(
    result.status,
    0,
    `${label} failed (${result.error ?? result.signal ?? result.status}); log: ${log}\n${result.stdout}\n${result.stderr}`,
  );
}

try {
  run('pack', pnpm, ['pack', '--pack-destination', temporary], packageRoot);
  const tarballs = readdirSync(temporary).filter((file) =>
    file.endsWith('.tgz'),
  );
  assert.equal(tarballs.length, 1);
  writeFileSync(
    path.join(temporary, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  // Install only the packed parser first, without any host or workspace links.
  run('install-parser', pnpm, [
    'add',
    '--ignore-scripts',
    path.join(temporary, tarballs[0]),
  ]);
  assert.equal(
    existsSync(path.join(temporary, 'node_modules/@rsbuild/core')),
    false,
  );
  run('parser', process.execPath, [
    '--input-type=module',
    '--eval',
    `
import assert from 'node:assert/strict';
import {
  prepareDocumentation, parseDocumentation, compileDocumentation,
  parseDocumentationCode,
} from '${manifest.name}/parser';
const source = '# Title {#title}\\n\\n\`example\`';
const { tree, ranges } = parseDocumentationCode('guide.mdx', source);
assert.deepEqual(tree, parseDocumentation('guide.mdx', source));
assert.deepEqual(ranges.map(({ start, end }) => source.slice(start, end)), ['example']);
assert.equal(compileDocumentation('guide.mdx', source).type, 'Program');
assert.ok(prepareDocumentation(source).value.includes('\\\\{#title}'));
await assert.rejects(import('${manifest.name}/src/version-bindings.mjs'), {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
`,
  ]);

  const installedRoot = path.join(temporary, 'node_modules', manifest.name);
  for (const file of [
    'LICENSE',
    'README.md',
    'src/parser.d.mts',
    'src/rsbuild.d.mts',
  ]) {
    assert.ok(
      existsSync(path.join(installedRoot, file)),
      `Missing packed file: ${file}`,
    );
  }
  for (const directory of ['tests', 'scripts']) {
    assert.equal(existsSync(path.join(installedRoot, directory)), false);
  }

  run('install-host', pnpm, [
    'add',
    '--ignore-scripts',
    `@rsbuild/core@${manifest.devDependencies['@rsbuild/core']}`,
    `typescript@${manifest.devDependencies.typescript}`,
    `@types/node@${manifest.devDependencies['@types/node']}`,
  ]);
  writeFileSync(
    path.join(temporary, 'consumer.mts'),
    `
import {
  prepareDocumentation, parseDocumentation, compileDocumentation,
  parseDocumentationCode, type CodeRange, type SourceSegment,
} from '${manifest.name}/parser';
import {
  pluginVersionBindings, type VersionBindingsOptions,
} from '${manifest.name}/rsbuild';
import type { RsbuildPlugin } from '@rsbuild/core';

const options: VersionBindingsOptions = { versionFile: '/consumer/version.json' };
const plugin: RsbuildPlugin = pluginVersionBindings(options);
const prepared: SourceSegment[] = prepareDocumentation('').segments;
const ranges: CodeRange[] = parseDocumentationCode('guide.md', '').ranges;
const root: 'root' = parseDocumentation('guide.md', '').type;
const program: 'Program' = compileDocumentation('guide.mdx', '').type;
for (const node of parseDocumentation('guide.mdx', '').children) {
  if (node.type === 'mdxjsEsm') {
    const moduleSource: string = node.value;
  }
  if (node.type === 'mdxJsxFlowElement') {
    const component: string | null | undefined = node.name;
  }
}
// @ts-expect-error The consuming site must provide its metadata path.
pluginVersionBindings({});
// @ts-expect-error Parser input must be text.
parseDocumentation('guide.md', null);
`,
  );
  writeFileSync(
    path.join(temporary, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ESNext',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        types: ['node'],
      },
      files: ['consumer.mts'],
    }),
  );
  run('types', process.execPath, [
    path.join(temporary, 'node_modules/typescript/bin/tsc'),
    '--project',
    'tsconfig.json',
  ]);
  writeFileSync(
    path.join(temporary, 'version.json'),
    JSON.stringify({ LYNX_VERSION: '9.8.7', PRIMJS_VERSION: '6.5.4' }),
  );
  writeFileSync(
    path.join(temporary, 'guide.md'),
    '`{versionJson.LYNX_VERSION}-{versionJson.PRIMJS_VERSION}`',
  );
  run('build', process.execPath, [
    '--input-type=module',
    '--eval',
    `
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createRsbuild } from '@rsbuild/core';
import { pluginVersionBindings } from '${manifest.name}/rsbuild';

const rsbuild = await createRsbuild({
  rsbuildConfig: {
    mode: 'production',
    logLevel: 'silent',
    source: { entry: { index: path.resolve('guide.md') } },
    output: { target: 'node', distPath: { root: 'build' } },
    plugins: [pluginVersionBindings({ versionFile: path.resolve('version.json') })],
    tools: { rspack: {
      module: { rules: [{ test: /\\.md$/, type: 'asset/source' }] },
      output: { library: { type: 'commonjs2' }, filename: '[name].cjs' },
    } },
    performance: { buildCache: false, printFileSize: false },
  },
});
const build = await rsbuild.build();
await build.close();
const require = createRequire(import.meta.url);
assert.equal(require(path.resolve('build/index.cjs')), '\`9.8.7-6.5.4\`');
`,
  ]);
  completed = true;
  console.log(
    '[pack-check] Isolated parser imports, consumer types, and Rsbuild output pass.',
  );
} finally {
  if (completed) rmSync(temporary, { recursive: true, force: true });
  else
    console.error(`[pack-check] Retained fixture and full logs: ${temporary}`);
}
