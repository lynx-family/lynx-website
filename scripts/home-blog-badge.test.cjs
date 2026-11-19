const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
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

// Fixed page metadata keeps badge behavior independent of published posts.
function post(lang, filename, title, frontmatter) {
  return {
    lang,
    title,
    frontmatter,
    routePath: `${lang === 'zh' ? '/zh' : ''}/blog/${filename}`,
  };
}

function setup(t, lang, pages, pageType = 'home', crossVersion = false) {
  const destinations = [];
  const pageLoads = [];
  const selectedConfigs = [];
  const listeners = new Map();
  const attributes = new Map();
  const effects = [];
  let cleanups = [];
  const badge = {
    textContent: 'Server-rendered badge',
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener(name, fn) {
      listeners.get(name)?.delete(fn);
    },
  };
  const runtime = {
    useLang: () => lang,
    usePages: () => ({ pages }),
    usePage: () => ({ page: { pageType } }),
    useNavigate: () => (link) => destinations.push(link),
  };
  const blogPages = load('src/hooks/use-blog-pages.ts', {
    '@rspress/core/runtime': runtime,
  });
  const latest = load('src/hooks/use-latest-blog.ts', {
    './use-blog-pages': blogPages,
  });
  const react = {
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: (fn) => effects.push(fn),
    useState: () => [null, () => {}],
  };
  const routes = {
    BLOG_BASE: '/next',
    BLOG_IS_CROSS_VERSION: crossVersion,
  };
  const utils = load('src/lib/utils.ts', {
    clsx: {},
    'tailwind-merge': {},
    '@route-config': routes,
  });
  const canonical = load('src/hooks/use-canonical-latest-blog.ts', {
    react,
    '@rspress/core/runtime': runtime,
    '@route-config': routes,
    '../lib/utils': utils,
    './use-latest-blog': latest,
  });
  const { useBlogBtnDom } = load(
    'theme/hooks/use-blog-btn-dom.ts',
    {
      react,
      '@rspress/core/runtime': runtime,
      // Pinned cross-version cases exercise the real canonical routing.
      // Unpinned RSS fetching is outside this fixture's scope.
      '@/hooks/use-canonical-latest-blog': {
        useCanonicalLatestBlog: (config) => {
          selectedConfigs.push(config);
          return canonical.useCanonicalLatestBlog(config);
        },
      },
      '@route-config': routes,
    },
    {
      window: { location: { assign: (link) => pageLoads.push(link) } },
      document: {
        querySelector: (selector) => {
          if (selector === '.rp-home-hero__badge') return badge;
          if (selector === '.rp-home-hero__title') return { parentElement: {} };
          return null;
        },
      },
    },
  );
  const dispose = () => {
    for (const cleanup of cleanups) cleanup?.();
    cleanups = [];
  };
  t.after(dispose);

  return {
    badge,
    destinations,
    pageLoads,
    selectedConfigs,
    dispose,
    render(src) {
      // Run cleanup before the next effect so stale click handlers are visible.
      dispose();
      useBlogBtnDom(src);
      cleanups = effects.splice(0).map((effect) => effect());
    },
    dispatch(name, event = {}) {
      for (const listener of listeners.get(name) ?? []) listener(event);
    },
  };
}

for (const lang of ['en', 'zh']) {
  test(`${lang}: home blog badge`, async (t) => {
    const latestPost = post(lang, 'latest-release', 'Latest release', {
      date: '2026-09-30',
      badge_text: 'A new release is available',
    });
    const productPost = post(lang, 'lynxtron', 'Introducing Lynxtron', {
      date: '2026-09-21',
      badge_text: 'Try Lynxtron',
      featured: true,
    });

    await t.test('main badge follows date, not featured or product', (t) => {
      const harness = setup(t, lang, [productPost, latestPost]);
      harness.render('/');

      assert.equal(harness.selectedConfigs[0], undefined);
      assert.equal(
        harness.badge.textContent,
        latestPost.frontmatter.badge_text,
      );
      harness.dispatch('click');
      harness.dispatch('touchstart');
      assert.deepEqual(harness.destinations, [
        latestPost.routePath,
        latestPost.routePath,
      ]);
    });

    await t.test('hidden and other-language newer posts are excluded', (t) => {
      const hidden = post(lang, 'hidden-newer', 'Hidden announcement', {
        date: '2026-10-10',
        blog_hidden: true,
      });
      const otherLanguage = post(
        lang === 'en' ? 'zh' : 'en',
        'other-language',
        'Another language',
        { date: '2026-10-20' },
      );
      const harness = setup(t, lang, [hidden, otherLanguage, latestPost]);
      harness.render('/');

      assert.equal(
        harness.badge.textContent,
        latestPost.frontmatter.badge_text,
      );
      harness.dispatch('click');
      assert.deepEqual(harness.destinations, [latestPost.routePath]);
    });

    await t.test(
      'a newer post updates the title and click destination',
      (t) => {
        const pages = [latestPost];
        const harness = setup(t, lang, pages);
        harness.render('/');

        const newer = post(lang, 'newer', 'A newer neutral post', {
          date: '2026-10-01',
        });
        pages.push(newer);
        harness.render('/');

        assert.equal(harness.badge.textContent, newer.title);
        harness.dispatch('click');
        assert.deepEqual(harness.destinations, [newer.routePath]);
        harness.dispose();
        harness.dispatch('click');
        harness.dispatch('touchstart');
        assert.deepEqual(harness.destinations, [newer.routePath]);
      },
    );

    await t.test(
      'no posts keeps the localized fallback without navigation',
      (t) => {
        const harness = setup(t, lang, []);
        harness.render('/');

        assert.equal(
          harness.badge.textContent,
          lang === 'zh' ? '阅读最新博客' : 'Read the Latest Blog',
        );
        harness.dispatch('click');
        harness.dispatch('touchstart');
        assert.deepEqual(harness.destinations, []);
      },
    );

    await t.test(
      'Lynxtron subsite pins its article even when it is older',
      (t) => {
        const harness = setup(t, lang, [latestPost, productPost]);
        harness.render('/lynxtron/');

        assert.equal(harness.selectedConfigs[0].filename, 'lynxtron');
        assert.equal(harness.badge.textContent, productPost.title);
        harness.dispatch('click');
        assert.deepEqual(harness.destinations, [productPost.routePath]);
      },
    );

    await t.test('hidden Lynxtron article keeps the subsite fallback', (t) => {
      const hiddenProduct = {
        ...productPost,
        frontmatter: { ...productPost.frontmatter, blog_hidden: true },
      };
      const harness = setup(t, lang, [latestPost, hiddenProduct]);
      harness.render('/lynxtron/');

      assert.equal(harness.selectedConfigs[0].filename, 'lynxtron');
      assert.equal(harness.badge.textContent, 'Lynxtron');
      harness.dispatch('click');
      harness.dispatch('touchstart');
      assert.deepEqual(harness.destinations, []);
    });

    for (const crossVersion of [false, true]) {
      const base = crossVersion ? '/next' : '';
      const uiCopy =
        lang === 'zh' ? 'lynx-ui 正式发布' : 'lynx-ui is officially released';

      await t.test(
        `UI follows its pinned post's registered route (${crossVersion ? 'archived' : 'developing'})`,
        (t) => {
          const uiPost = post(lang, 'lynx-ui', 'Introducing UI', {
            date: '2026-09-01',
            badge_text: 'Different blog copy',
          });
          // The registered route, rather than a hardcoded badge URL, wins.
          uiPost.routePath = `${lang === 'zh' ? '/zh' : ''}/blog/announcements/lynx-ui`;
          const harness = setup(
            t,
            lang,
            [latestPost, uiPost],
            'home',
            crossVersion,
          );
          harness.render('/ui/');

          assert.equal(harness.selectedConfigs[0].filename, 'lynx-ui');
          assert.equal(harness.badge.textContent, uiCopy);
          assert.equal(harness.badge.getAttribute('role'), 'link');
          assert.equal(harness.badge.getAttribute('tabindex'), '0');
          harness.dispatch('click');
          harness.dispatch('touchstart');
          let prevented = false;
          harness.dispatch('keydown', {
            key: 'Enter',
            preventDefault: () => (prevented = true),
          });
          assert.equal(prevented, true);
          // Space scrolls for a link; held Enter does not navigate repeatedly.
          harness.dispatch('keydown', { key: ' ' });
          harness.dispatch('keydown', { key: 'Enter', repeat: true });

          const targets = crossVersion
            ? harness.pageLoads
            : harness.destinations;
          assert.deepEqual(
            targets,
            Array(3).fill(`${base}${uiPost.routePath}`),
          );
          assert.deepEqual(
            crossVersion ? harness.destinations : harness.pageLoads,
            [],
          );
          harness.dispose();
          harness.dispatch('click');
          harness.dispatch('touchstart');
          harness.dispatch('keydown', { key: 'Enter' });
          assert.equal(targets.length, 3);
          assert.equal(harness.badge.getAttribute('role'), null);
          assert.equal(harness.badge.getAttribute('tabindex'), null);
        },
      );

      await t.test(
        `missing UI post leaves a noninteractive announcement (${crossVersion ? 'archived' : 'developing'})`,
        (t) => {
          const harness = setup(t, lang, [latestPost], 'home', crossVersion);
          harness.render('/ui/');

          assert.equal(harness.badge.textContent, uiCopy);
          assert.equal(harness.badge.className, 'rp-home-hero__badge');
          assert.equal(harness.badge.getAttribute('role'), null);
          assert.equal(harness.badge.getAttribute('tabindex'), null);
          harness.dispatch('click');
          harness.dispatch('touchstart');
          harness.dispatch('keydown', { key: 'Enter' });
          assert.deepEqual(harness.pageLoads, []);
          assert.deepEqual(harness.destinations, []);
        },
      );
    }

    await t.test('switching to React removes interactive badge state', (t) => {
      const uiPost = post(lang, 'lynx-ui', 'Introducing UI', {});
      const harness = setup(t, lang, [latestPost, uiPost]);
      harness.render('/ui/');
      harness.render('/react/');

      assert.equal(harness.badge.textContent, 'ReactLynx');
      assert.equal(harness.badge.className, 'rp-home-hero__badge');
      assert.equal(harness.badge.getAttribute('role'), null);
      assert.equal(harness.badge.getAttribute('tabindex'), null);
      harness.dispatch('click');
      harness.dispatch('keydown', { key: 'Enter' });
      assert.deepEqual(harness.destinations, []);
    });

    await t.test('non-home pages leave the badge untouched', (t) => {
      const harness = setup(t, lang, [latestPost], 'doc');
      harness.render('/');

      assert.equal(harness.badge.textContent, 'Server-rendered badge');
      harness.dispatch('click');
      assert.deepEqual(harness.destinations, []);
    });
  });
}
