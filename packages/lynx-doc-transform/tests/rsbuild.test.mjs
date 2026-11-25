import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { pluginVersionBindings } from '@lynx-js/lynx-doc-transform/rsbuild';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'version-bindings-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const versionFile = path.join(root, 'version.json');
  const write = (value) =>
    writeFile(
      versionFile,
      JSON.stringify({ LYNX_VERSION: value, PRIMJS_VERSION: '4.2.1' }),
    );
  await write('4.2.0');
  return { root, versionFile, write };
}

function setup(options) {
  const hooks = {};
  const dependencies = [];
  const missingDependencies = [];
  pluginVersionBindings(options).setup({
    onBeforeBuild(handler) {
      hooks.build = (params = {}) => handler({ isWatch: false, ...params });
    },
    onBeforeDevCompile(handler) {
      hooks.dev = () => handler({ isWatch: true });
    },
    transform(descriptor, handler) {
      hooks.descriptor = descriptor;
      hooks.transform = (overrides = {}) =>
        handler({
          code: '`{versionJson.LYNX_VERSION}`',
          resourcePath: '/downstream/sharedDocs/fragment.mdx',
          resourceQuery: '',
          environment: { name: 'web' },
          addDependency(file) {
            dependencies.push(file);
          },
          addMissingDependency(file) {
            missingDependencies.push(file);
          },
          ...overrides,
        });
    },
  });
  return { hooks, dependencies, missingDependencies };
}

test('applies the same snapshot in every compiler and refreshes each build cycle', async (t) => {
  const { versionFile, write } = await fixture(t);
  const { hooks, dependencies } = setup({ versionFile });
  assert.equal(hooks.descriptor.order, 'pre');
  for (const file of ['a.md', '/outside/docs/partial.mdx'])
    assert.ok(hooks.descriptor.test.test(file));
  assert.ok(!hooks.descriptor.test.test('a.ts'));
  assert.throws(() => hooks.transform(), /snapshot/);
  dependencies.length = 0;
  await hooks.build();
  await write('5.0.0');
  for (const name of ['web', 'node', 'node_md']) {
    const result = hooks.transform({ environment: { name } });
    assert.equal(result.code, '`4.2.0`');
    assert.equal(
      JSON.parse(result.map).sourcesContent[0],
      '`{versionJson.LYNX_VERSION}`',
    );
  }
  assert.deepEqual(dependencies, [versionFile, versionFile, versionFile]);
  await hooks.dev();
  assert.equal(hooks.transform().code, '`5.0.0`');
  await write('6.0.0');
  await hooks.build();
  assert.equal(hooks.transform().code, '`6.0.0`');
});

test('keeps raw requests and explicitly literal documents unchanged', async (t) => {
  const { root, versionFile } = await fixture(t);
  const literal = path.join(root, 'syntax.mdx');
  const { hooks, dependencies } = setup({
    versionFile,
    literalDocuments: [literal],
  });
  await hooks.build();
  const source = '`{versionJson.UNKNOWN}`';
  for (const resourceQuery of ['?raw', '?raw=true', '?other=1&raw']) {
    assert.equal(hooks.transform({ code: source, resourceQuery }), source);
  }
  assert.equal(
    hooks.transform({ code: source, resourcePath: literal }),
    source,
  );
  assert.equal(hooks.transform({ code: 'No bindings' }), 'No bindings');
  assert.deepEqual(dependencies, []);
  assert.throws(
    () => hooks.transform({ code: source, resourceQuery: '?draw=1' }),
    /Unknown version/,
  );
  assert.throws(
    () => hooks.transform({ code: source, resourcePath: `${literal}.mdx` }),
    /Unknown version/,
  );
});

test('overlapping watch refreshes never expose an empty metadata snapshot', async (t) => {
  const { versionFile, write } = await fixture(t);
  const { hooks } = setup({ versionFile });
  await hooks.build();
  await write('5.0.0');
  const refreshes = [hooks.build(), hooks.build()];
  try {
    // A compiler already in flight may transform while other compilers refresh.
    for (const name of ['web', 'node', 'node_md']) {
      assert.equal(hooks.transform({ environment: { name } }).code, '`5.0.0`');
    }
  } finally {
    await Promise.all(refreshes);
  }
});

test('fails ordinary builds on invalid metadata and does not reuse a stale snapshot', async (t) => {
  const { versionFile } = await fixture(t);
  const { hooks } = setup({ versionFile });
  await hooks.build();
  for (const source of ['{invalid json', 'null', '[]']) {
    await writeFile(versionFile, source);
    await assert.rejects(hooks.build(), /Cannot load version metadata/);
    assert.throws(() => hooks.transform(), /Cannot load version metadata/);
  }
  await rm(versionFile);
  await assert.rejects(
    hooks.build(),
    /Cannot load version metadata.*version\.json/,
  );
  assert.throws(
    () => pluginVersionBindings({ versionFile: 'relative.json' }),
    /absolute/,
  );
  assert.throws(
    () =>
      pluginVersionBindings({ versionFile, literalDocuments: ['syntax.mdx'] }),
    /absolute/,
  );
});

test('watch and development compilation recover from invalid or missing metadata', async (t) => {
  for (const mode of ['build', 'dev']) {
    await t.test(mode, async (t) => {
      const { versionFile, write } = await fixture(t);
      const { hooks, dependencies, missingDependencies } = setup({
        versionFile,
      });
      const refresh = () => hooks[mode]({ isWatch: true });
      await refresh();
      assert.equal(hooks.transform().code, '`4.2.0`');
      for (const source of ['{invalid json', 'null', '[]']) {
        await writeFile(versionFile, source);
        await refresh();
        dependencies.length = 0;
        assert.throws(() => hooks.transform(), /Cannot load version metadata/);
        assert.deepEqual(dependencies, [versionFile]);
        assert.equal(hooks.transform({ code: 'No bindings' }), 'No bindings');
        assert.equal(
          hooks.transform({ resourceQuery: '?raw' }),
          '`{versionJson.LYNX_VERSION}`',
        );
        await write('5.1.0');
        await refresh();
        assert.equal(hooks.transform().code, '`5.1.0`');
      }
      await rm(versionFile);
      await refresh();
      assert.throws(
        () => hooks.transform(),
        /Cannot load version metadata.*ENOENT/,
      );
      assert.deepEqual(missingDependencies, [versionFile]);
      await write('6.0.0');
      await refresh();
      assert.equal(hooks.transform().code, '`6.0.0`');
    });
  }
});

test('an initially invalid or missing metadata file remains a watched dependency', async (t) => {
  const { versionFile, write } = await fixture(t);
  const { hooks, dependencies, missingDependencies } = setup({ versionFile });
  await writeFile(versionFile, '{invalid json');
  await hooks.dev();
  assert.throws(() => hooks.transform(), /Cannot load version metadata/);
  assert.deepEqual(dependencies, [versionFile]);
  await rm(versionFile);
  await hooks.dev();
  assert.throws(
    () => hooks.transform(),
    /Cannot load version metadata.*ENOENT/,
  );
  assert.deepEqual(missingDependencies, [versionFile]);
  await write('5.1.0');
  await hooks.dev();
  assert.equal(hooks.transform().code, '`5.1.0`');
});

test('keeps metadata contexts independent between consuming sites', async (t) => {
  const first = await fixture(t);
  const second = await fixture(t);
  await second.write('3.3.0');
  const a = setup({ versionFile: first.versionFile });
  const b = setup({ versionFile: second.versionFile });
  await a.hooks.build();
  await b.hooks.build();
  assert.equal(a.hooks.transform().code, '`4.2.0`');
  assert.equal(b.hooks.transform().code, '`3.3.0`');
});
