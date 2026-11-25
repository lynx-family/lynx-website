import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createRsbuild } from '@rsbuild/core';
import { parse } from 'parse5';

import { pluginVersionBindings } from '@lynx-js/lynx-doc-transform/rsbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function textContent(node) {
  if (node.nodeName === '#text') return node.value;
  return (node.childNodes ?? []).map(textContent).join('');
}

test(
  'Rspress publishes resolved code in HTML, page Markdown, and llms-full',
  { timeout: 120_000 },
  async (t) => {
    const fixture = await mkdtemp(
      path.join(os.tmpdir(), 'version-bindings-build-'),
    );
    t.after(() => rm(fixture, { recursive: true, force: true }));
    await symlink(
      path.join(root, 'node_modules'),
      path.join(fixture, 'node_modules'),
      'junction',
    );
    const write = async (file, content) => {
      const target = path.join(fixture, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    };
    const pluginPath = path.join(root, 'src/rsbuild.mjs');
    await write(
      'rspress.config.mts',
      `
    import { pluginVersionBindings } from ${JSON.stringify(pluginPath)};
    export default {
      root: 'docs',
      outDir: 'build',
      base: '/test/',
      title: 'Binding fixture',
      llms: true,
      route: { cleanUrls: true, exclude: ['fragments/**'] },
      builderConfig: {
        plugins: [pluginVersionBindings({ versionFile: ${JSON.stringify(path.join(fixture, 'version.json'))} })],
        performance: { printFileSize: false, buildCache: false }
      }
    };
  `,
    );
    await write(
      'version.json',
      JSON.stringify({ LYNX_VERSION: '9.8.7', PRIMJS_VERSION: '6.5.4' }),
    );
    await write(
      'docs/index.mdx',
      [
        '---',
        'title: Native setup',
        '---',
        'import Fragment from "../sharedDocs/native.mdx";',
        '',
        '# Setup {#setup}',
        '',
        '```text',
        'lynx={versionJson.LYNX_VERSION}-rc.1',
        '```',
        '',
        '<Fragment />',
      ].join('\n'),
    );
    await write(
      'sharedDocs/native.mdx',
      ['```text', 'primjs={versionJson.PRIMJS_VERSION}-debug', '```'].join(
        '\n',
      ),
    );
    await write(
      'docs/plain.md',
      '---\ndescription: A native dependency example.\n---\n# Plain Markdown\n\n`plain={versionJson.LYNX_VERSION}`\n',
    );
    const result = spawnSync(
      process.execPath,
      [path.join(root, 'node_modules/@rspress/core/bin/rspress.js'), 'build'],
      {
        cwd: fixture,
        encoding: 'utf8',
        timeout: 110_000,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          RSPRESS_SSG_WORKER_THREAD_COUNT: '1',
        },
      },
    );
    // Save complete compiler output before assertions.
    await write('build.log', `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
    assert.equal(
      result.status,
      0,
      `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`,
    );
    for (const [file, values] of [
      ['index.html', ['lynx=9.8.7-rc.1', 'primjs=6.5.4-debug']],
      ['index.md', ['lynx=9.8.7-rc.1', 'primjs=6.5.4-debug']],
      ['plain.html', ['plain=9.8.7']],
      ['plain.md', ['plain=9.8.7']],
      [
        'llms-full.txt',
        ['lynx=9.8.7-rc.1', 'primjs=6.5.4-debug', 'plain=9.8.7'],
      ],
    ]) {
      const output = await readFile(path.join(fixture, 'build', file), 'utf8');
      // Read text across Shiki spans while preserving plain-text exports.
      const text = file.endsWith('.html') ? textContent(parse(output)) : output;
      for (const value of values)
        assert.ok(text.includes(value), `${file}: missing ${value}`);
      const unresolved = output.indexOf('{versionJson.');
      assert.equal(
        unresolved,
        -1,
        `${file}: unresolved binding in ${output.slice(Math.max(0, unresolved - 150), unresolved + 150)}`,
      );
    }
  },
);

for (const mode of ['build', 'dev']) {
  for (const initial of ['valid', 'invalid', 'missing']) {
    test(
      `${mode} watch recovers from metadata errors in all environments (initially ${initial})`,
      { timeout: 60_000 },
      async (t) => {
        const fixture = await mkdtemp(
          path.join(os.tmpdir(), 'version-bindings-watch-'),
        );
        let build;
        t.after(async () => {
          await build?.close();
          await rm(fixture, { recursive: true, force: true });
        });
        const versionFile = path.join(fixture, 'version.json');
        const entry = path.join(fixture, 'example.md');
        await writeFile(entry, '`{versionJson.LYNX_VERSION}`');
        const writeVersion = (version) =>
          writeFile(
            versionFile,
            JSON.stringify({
              LYNX_VERSION: version,
              PRIMJS_VERSION: '4.2.1',
            }),
          );
        if (initial === 'valid') await writeVersion('4.2.0');
        else if (initial === 'invalid')
          await writeFile(versionFile, '{invalid json');
        const seen = new Map();
        const compiled = new Map();
        let cycle = Promise.withResolvers();
        const waitForCycle = async (hasErrors, value) => {
          let timer;
          try {
            const stats = await Promise.race([
              cycle.promise,
              new Promise((_, reject) => {
                timer = setTimeout(
                  () =>
                    reject(
                      new Error(`Timed out waiting for ${mode} watch cycle`),
                    ),
                  12_000,
                );
              }),
            ]);
            assert.equal(stats.hasErrors(), hasErrors, stats.toString());
            for (const name of ['web', 'node', 'node_md']) {
              assert.equal(compiled.get(name).hasErrors(), hasErrors);
              if (hasErrors) {
                assert.match(
                  compiled.get(name).toString(),
                  /Cannot load version metadata/,
                );
                assert.ok(!seen.has(name), `${name}: used a stale snapshot`);
              } else assert.equal(seen.get(name), `\`${value}\``);
            }
          } finally {
            clearTimeout(timer);
          }
          cycle = Promise.withResolvers();
          seen.clear();
          compiled.clear();
        };
        const rsbuild = await createRsbuild({
          cwd: fixture,
          rsbuildConfig: {
            mode: 'development',
            logLevel: 'silent',
            plugins: [
              pluginVersionBindings({ versionFile }),
              {
                name: 'observe-transformed-markdown',
                setup(api) {
                  api.transform({ test: /\.md$/ }, ({ code, environment }) => {
                    seen.set(environment.name, code);
                    return code;
                  });
                  api.onAfterEnvironmentCompile(({ stats, environment }) => {
                    compiled.set(environment.name, stats);
                  });
                  // File watchers can invalidate the compilers in separate batches.
                  const finish = ({ stats }) => {
                    if (compiled.size === 3) cycle.resolve(stats);
                  };
                  api.onAfterBuild(finish);
                  api.onAfterDevCompile(finish);
                },
              },
            ],
            environments: Object.fromEntries(
              ['web', 'node', 'node_md'].map((name) => [
                name,
                {
                  source: { entry: { index: entry } },
                  output: {
                    target: name === 'web' ? 'web' : 'node',
                    distPath: { root: path.join(fixture, 'dist', name) },
                  },
                },
              ]),
            ),
            tools: {
              rspack: {
                module: { rules: [{ test: /\.md$/, type: 'asset/source' }] },
                plugins: [
                  {
                    apply(compiler) {
                      compiler.hooks.failed.tap(
                        'observe-fatal-watch-error',
                        (error) => {
                          cycle.reject(error);
                        },
                      );
                    },
                  },
                ],
              },
            },
            server: { host: '127.0.0.1', port: 0, printUrls: false },
            performance: { buildCache: false, printFileSize: false },
          },
        });
        if (mode === 'build') build = await rsbuild.build({ watch: true });
        else build = await rsbuild.createDevServer();
        await waitForCycle(initial !== 'valid', '4.2.0');
        await writeVersion('5.1.0');
        await waitForCycle(false, '5.1.0');
        await writeFile(versionFile, '{invalid json');
        await waitForCycle(true);
        await writeVersion('6.0.0');
        await waitForCycle(false, '6.0.0');
        await rm(versionFile);
        await waitForCycle(true);
        await writeVersion('7.0.0');
        await waitForCycle(false, '7.0.0');
      },
    );
  }
}
