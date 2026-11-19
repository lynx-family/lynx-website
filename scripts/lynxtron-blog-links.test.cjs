const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const matter = require('gray-matter');

const root = path.resolve(__dirname, '..');

test('Lynxtron blog entry, localized title and extensionless links', () => {
  for (const lang of ['en', 'zh']) {
    const dir = path.join(root, 'docs', lang, 'blog');
    const order = JSON.parse(fs.readFileSync(path.join(dir, '_meta.json')));
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

test('Go delegates localized learn-more URLs to the Rspress adapter', () => {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, 'src/components/go/Go.tsx'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const withBase = () => {
    assert.fail('Go must leave base resolution to go-web');
  };
  const imports = {
    path,
    react: { useMemo: (fn) => fn() },
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    '@lynx-js/go-web': { Go: 'Go', GoConfigProvider: 'Provider' },
    '@lynx-js/go-web/adapters/rspress': { rspressAdapter: { withBase } },
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
  assert.equal(config.withBase, withBase);
  assert.deepEqual(
    { ...config.nativeFrameworks.lynxtron.learnMoreUrl },
    { en: '/lynxtron/go', cn: '/zh/lynxtron/go' },
  );
});
