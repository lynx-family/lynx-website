const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const matter = require('gray-matter');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function load(file, imports, globals = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, file), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return exports;
}

for (const lang of ['en', 'zh']) {
  test(`${lang}: main badge follows date, not featured or product`, () => {
    const pages = fs
      .readdirSync(path.join(root, `docs/${lang}/blog`))
      .filter((name) => /\.mdx?$/.test(name) && !name.startsWith('index.'))
      .map((name) => {
        const { data } = matter.read(
          path.join(root, `docs/${lang}/blog`, name),
        );
        return {
          lang,
          title: data.title,
          frontmatter: data,
          routePath: `${lang === 'zh' ? '/zh' : ''}/blog/${name.replace(/\.mdx?$/, '')}`,
        };
      });
    let destination;
    let selectedConfig;
    const listeners = {};
    const badge = {
      textContent: '',
      addEventListener: (name, fn) => {
        listeners[name] = fn;
      },
    };
    const runtime = {
      useLang: () => lang,
      usePages: () => ({ pages }),
      usePageData: () => ({ page: { pageType: 'home' } }),
      useNavigate: () => (link) => {
        destination = link;
      },
    };
    const blogPages = load('src/hooks/use-blog-pages.ts', {
      '@rspress/core/runtime': runtime,
    });
    const latest = load('src/hooks/use-latest-blog.ts', {
      './use-blog-pages': blogPages,
    });
    const { useBlogBtnDom } = load(
      'theme/hooks/use-blog-btn-dom.ts',
      {
        react: {
          useMemo: (fn) => fn(),
          useCallback: (fn) => fn,
          useEffect: (fn) => fn(),
        },
        '@rspress/core/runtime': runtime,
        '@site/src/hooks': {
          useCanonicalLatestBlog: (config) => {
            selectedConfig = config;
            return latest.useLatestBlog(config);
          },
        },
        '@site/shared-route-config': { BLOG_IS_CROSS_VERSION: false },
      },
      {
        document: {
          querySelector: (selector) =>
            selector === '.rp-home-hero__badge' ? badge : { parentElement: {} },
        },
      },
    );

    useBlogBtnDom('/');
    assert.equal(selectedConfig, undefined);
    const newest = [...pages].sort(
      (a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date),
    )[0];
    assert.equal(
      badge.textContent,
      newest.frontmatter.badge_text || newest.title,
    );
    listeners.click();
    assert.equal(destination, newest.routePath);

    pages.push({
      lang,
      title: 'A newer neutral post',
      frontmatter: { date: '2099-01-01' },
      routePath: '/blog/newer',
    });
    useBlogBtnDom('/');
    assert.equal(badge.textContent, 'A newer neutral post');
    listeners.click();
    assert.equal(destination, '/blog/newer');

    useBlogBtnDom('/lynxtron/');
    listeners.click();
    assert.equal(destination, `${lang === 'zh' ? '/zh' : ''}/blog/lynxtron`);

    pages.length = 0;
    useBlogBtnDom('/');
    assert.equal(
      badge.textContent,
      lang === 'zh' ? '阅读最新博客' : 'Read the Latest Blog',
    );
  });
}
