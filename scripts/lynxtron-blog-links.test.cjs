const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const matter = require('gray-matter');

const root = path.resolve(__dirname, '..');

test('Lynxtron blog ordering, localized title and extensionless links', () => {
  for (const lang of ['en', 'zh']) {
    const dir = path.join(root, 'docs', lang, 'blog');
    const order = JSON.parse(fs.readFileSync(path.join(dir, '_meta.json')));
    assert.equal(order[0], 'lynxtron');
    assert.equal(order.filter((slug) => slug === 'lynxtron').length, 1);
    const post = matter.read(path.join(dir, 'lynxtron.mdx'));
    if (lang === 'zh') assert.equal(post.data.title, '正式发布 Lynxtron');
    assert.doesNotMatch(post.content, /\]\(\/[^)]*\.mdx(?:[)#])/);
    assert.ok(
      post.content.includes(
        '/lynxtron/api/@lynx-js/lynxtron/Class.LynxWindow)',
      ),
    );
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          'docs',
          lang,
          'lynxtron/api/@lynx-js/lynxtron/Class.LynxWindow.mdx',
        ),
      ),
    );
  }
});

for (const base of ['/', '/next/', '/custom/docs/']) {
  test(`Go learn-more links respect ${base}`, () => {
    const source = ts.transpileModule(
      fs.readFileSync(path.join(root, 'src/components/go/Go.tsx'), 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText;
    const imports = {
      path,
      react: { useMemo: (fn) => fn() },
      'react/jsx-runtime': {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      },
      '@rspress/core/runtime': { withBase: (url) => base + url.slice(1) },
      '@lynx-js/go-web': { Go: 'Go', GoConfigProvider: 'Provider' },
      '@lynx-js/go-web/adapters/rspress': { rspressAdapter: {} },
      '@lynx-js/go-web/ssg': { ExamplePreviewSSG: 'SSG' },
      '../Callout': {},
    };
    const exports = {};
    vm.runInNewContext(source, {
      exports,
      process: { env: {} },
      __dirname: path.join(root, 'src/components/go'),
      require: (name) => {
        assert.ok(name in imports, `Unexpected import: ${name}`);
        return imports[name];
      },
    });
    const config = exports.Go({ example: 'cross-platform-notes' }).props.config;
    assert.equal(
      config.nativeFrameworks.lynxtron.learnMoreUrl.en,
      base + 'lynxtron/go',
    );
    assert.equal(
      config.nativeFrameworks.lynxtron.learnMoreUrl.cn,
      base + 'zh/lynxtron/go',
    );
  });
}
