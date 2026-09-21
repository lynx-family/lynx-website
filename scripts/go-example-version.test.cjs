const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/components/go/Go.tsx');
const compiled = ts.transpileModule(
  `${fs.readFileSync(filename, 'utf8')}\nexport { ExampleVersion };`,
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;

function renderVersion(config) {
  const requests = [];
  const updates = [];
  const effects = [];
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    __dirname: path.dirname(filename),
    process,
    require(name) {
      if (name === 'path') return path;
      if (name === 'react')
        return {
          useState: () => [undefined, (value) => updates.push(value)],
          useEffect: (effect, dependencies) =>
            effects.push({ effect, dependencies }),
        };
      if (name === '@lynx-js/go-web') return { useGoConfig: () => config };
      return {};
    },
    fetch(url) {
      return new Promise((resolve) => requests.push({ url, resolve }));
    },
  });
  exports.ExampleVersion({ example: 'native-texture-canvas' });
  const cleanup = effects[0].effect();
  return { requests, updates, cleanup, dependencies: effects[0].dependencies };
}

for (const [base, exampleBasePath] of [
  ['/', '/lynx-examples'],
  ['/next/', '/lynx-examples'],
  ['/release/3.5/', '/downstream-examples'],
]) {
  test(`version metadata uses provider configuration under ${base}`, async () => {
    const state = renderVersion({
      exampleBasePath,
      withBase: (value) => `${base}${value.slice(1)}`,
    });
    const expected = `${base}${exampleBasePath.slice(1)}/native-texture-canvas/example-metadata.json`;
    assert.equal(state.requests[0].url, expected);
    assert.equal(state.dependencies[0], expected);
    state.requests[0].resolve({
      ok: true,
      json: async () => ({ version: '0.0.7' }),
    });
    await new Promise(setImmediate);
    assert.equal(state.updates.at(-1), '0.0.7');
  });
}

test('obsolete requests cannot restore a stale version', async () => {
  const state = renderVersion({ exampleBasePath: '/custom-examples' });
  assert.equal(
    state.requests[0].url,
    '/custom-examples/native-texture-canvas/example-metadata.json',
  );
  state.cleanup();
  state.requests[0].resolve({
    ok: true,
    json: async () => ({ version: 'old' }),
  });
  await new Promise(setImmediate);
  assert.deepEqual(state.updates, [undefined]);
});
