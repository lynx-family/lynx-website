import { pluginLLMsPostprocess } from '@lynx-js/rspress-plugin-llms-postprocess';
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import type { RspressPlugin } from '@rspress/core';
import { defineConfig } from '@rspress/core';
import { transformerCompatibleMetaHighlight } from '@rspress/core/shiki-transformers';
import { pluginAlgolia } from '@rspress/plugin-algolia';
import { pluginClientRedirects } from '@rspress/plugin-client-redirects';
import { pluginRss } from '@rspress/plugin-rss';
import { pluginSitemap } from '@rspress/plugin-sitemap';
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pluginGoogleAnalytics } from 'rsbuild-plugin-google-analytics';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';
import {
  SHARED_DOC_FILES,
  SHARED_SIDEBAR_PATHS,
} from './shared-route-config.js';

const PUBLISH_URL = 'https://lynxjs.org/';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  route: {
    exclude: [
      'lynx-compat-data/**/*',
      '**/guide/start/fragments/**',
      '**/guide/custom-native-component/*',
      '**/guide/custom-native-modules/*',
      '**/guide/embed-lynx-to-native/*',
    ],
  },
  // outDir: 'doc_build',
  title: 'Lynx',
  description:
    'Empower the web community and invite more to build cross-platform apps',
  icon: '/assets/favicon.png',
  lang: 'en',
  globalStyles: path.join(__dirname, 'src', 'styles', 'global.css'),
  ssg: {
    experimentalWorker: true,
  },
  builderConfig: {
    performance: {
      buildCache: false,
    },
    plugins: [
      pluginGoogleAnalytics({ id: 'G-WGP37JWP9M' }),
      pluginOpenGraph({
        title: 'Lynx',
        type: 'website',
        url: PUBLISH_URL,
        image:
          'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/og-image.png',
        description:
          'Empower the web community and invite more to build cross-platform apps',
        twitter: {
          site: '@LynxJS_org',
          card: 'summary_large_image',
        },
      }),
      pluginSvgr(),
      pluginSass(),
      pluginLess(),
    ],
    resolve: {
      alias: {
        // be compatible to react@18, renderToMarkdownString within @rspress/core depends on react@19
        '@rspress/core/_private/react': path.join(
          __dirname,
          'node_modules/react-render-to-markdown/dist/index.js',
        ),
        '@site': path.join(__dirname),
        '@': path.join(__dirname, 'src'),
        '@assets': path.join(__dirname, 'public', 'assets'),
        '@lynx': path.join(__dirname, 'src', 'components'),
      },
    },
    source: {
      define: {
        'process.env': {
          // This marks the first open sourced version of Lynx.
          OSS: '3.2',
          COMPAT_TABLE_HIDE_CLAY: true,
          DOC_GIT_BASE_URL: JSON.stringify(
            'https://github.com/lynx-family/lynx-website/tree/main',
          ),
        },
      },
    },
    tools: {
      rspack: {
        resolve: {
          // This is a workaround for the lack of native fs and path modules in the browser in .server.tsx
          fallback: {
            fs: false,
            path: false,
          },
        },
      },
    },
  },
  logo: {
    light:
      'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-dark-logo.svg',
    dark: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-light-logo.svg',
  },
  base: '/next',
  themeConfig: {
    locales: [
      {
        lang: 'zh',
        title: 'Lynx',
        description: '帮助 Web 构建跨平台应用',
        label: '简体中文',
        editLink: {
          docRepoBaseUrl:
            'https://github.com/lynx-family/lynx-website/tree/main/docs',
          text: '📝 在 GitHub 上编辑此页',
        },
        searchNoResultsText: '未搜索到相关结果',
        searchPlaceholderText: '搜索文档',
        searchSuggestedQueryText: '可更换不同的关键字后重试',
        overview: {
          filterNameText: '过滤',
          filterPlaceholderText: '输入关键词',
          filterNoResultText: '未找到匹配的 API',
        },
      },
      {
        lang: 'en',
        title: 'Lynx',
        description:
          'Empower the web community and invite more to build cross-platform apps',
        label: 'English',
        editLink: {
          docRepoBaseUrl:
            'https://github.com/lynx-family/lynx-website/tree/main/docs',
          text: '📝 Edit this page on GitHub',
        },
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/lynx-family',
      },
      {
        icon: 'discord',
        mode: 'link',
        content: 'https://discord.gg/mXk7jqdDXk',
      },
      {
        icon: 'x',
        mode: 'link',
        content: 'https://x.com/lynxjs_org',
      },
    ],
  },
  plugins: [
    pluginClientRedirects({
      redirects: [
        {
          from: '/react/routing.html',
          to: '/react/routing/react-router.html',
        },
      ],
    }),
    genuiDocsPlugin(),
    sharedSidebarPlugin(),
    pluginSitemap({
      siteUrl: PUBLISH_URL,
    }),
    pluginRss({
      siteUrl: PUBLISH_URL,
      feed: [
        {
          id: 'blog-rss',
          test: '/blog',
          title: 'Lynx Blog',
          language: 'en',
          output: {
            type: 'rss',
            filename: 'blog-rss.xml',
          },
        },
        {
          id: 'blog-rss-zh',
          test: '/zh/blog',
          title: 'Lynx 博客',
          language: 'zh-CN',
          output: {
            type: 'rss',
            filename: 'blog-rss-zh.xml',
          },
        },
      ],
    }),
    pluginAlgolia({
      verificationContent: '6AD08DFB25B7234D',
    }),
    pluginLLMsPostprocess(),
  ],
  markdown: {
    defaultWrapCode: false,
    link: {
      checkDeadLinks: {
        excludes: ['/guide/spec.html?ts=1743416098203#element%E2%91%A0'],
      },
    },
    shiki: {
      transformers: [
        transformerCompatibleMetaHighlight(),
        transformerNotationHighlight(),
        transformerNotationDiff(),
        transformerNotationFocus(),
      ],
    },
  },
  llms: {
    remarkSplitMdxOptions: {
      includes: [
        [['Go', 'APITable', 'SimpleAPITable', 'BlogList'], '@lynx'],
        // Also support imports from @site/src/components
        [['BlogList'], '@site/src/components'],
      ],
    },
  },
});

function mapNonGuideSharedSectionsToGuide(
  lang: string,
  routes: string[],
  filenames: string[],
) {
  return routes
    .filter((route) => route !== 'guide')
    .flatMap((route) =>
      filenames.map((filename) => ({
        routePath: `/${lang}/${route}/${filename}`,
        filepath: path.join(__dirname, `docs/${lang}/guide`, `${filename}.mdx`),
      })),
    );
}

function sharedSidebarPlugin(): RspressPlugin {
  return {
    name: 'rspeedy:shared-sidebar',
    addPages(config, isProd) {
      const pages =
        config.themeConfig?.locales?.flatMap(({ lang }) =>
          mapNonGuideSharedSectionsToGuide(
            lang,
            SHARED_SIDEBAR_PATHS,
            SHARED_DOC_FILES,
          ),
        ) || [];

      return pages;
    },
  };
}

type GenUIDocPage = {
  lang: 'en' | 'zh';
  routePath: string;
  sources: string[];
};

const GENUI_PACKAGE_ROOT = path.join(
  __dirname,
  'node_modules',
  '@lynx-js',
  'genui',
);

const GENUI_DOC_ROOTS = [
  process.env.GENUI_SOURCE_ROOT,
  path.join(__dirname, '..', 'lynx-stack', 'packages', 'genui'),
  path.join(__dirname, '..', 'lynx-stack-upstream0', 'packages', 'genui'),
  GENUI_PACKAGE_ROOT,
].filter((root): root is string => Boolean(root));

const GENUI_DOC_PAGES: GenUIDocPage[] = [
  {
    lang: 'en',
    routePath: '/en/react/genui/index',
    sources: ['README.md', 'readme.md'],
  },
  {
    lang: 'en',
    routePath: '/en/react/genui/a2ui',
    sources: ['a2ui/README.md', 'a2ui/readme.md'],
  },
  {
    lang: 'zh',
    routePath: '/zh/react/genui/index',
    sources: ['README_zh.md', 'readme_zh.md', 'README.md', 'readme.md'],
  },
  {
    lang: 'zh',
    routePath: '/zh/react/genui/a2ui',
    sources: [
      'a2ui/README_zh.md',
      'a2ui/readme_zh.md',
      'a2ui/README.md',
      'a2ui/readme.md',
    ],
  },
];

function getGenUIDocUrl(lang: GenUIDocPage['lang'], page: string) {
  const langPrefix = lang === 'zh' ? '/zh' : '';
  return `${langPrefix}/react/genui/${page}.html`;
}

function resolveGenUIDocSource(sources: string[]) {
  for (const root of GENUI_DOC_ROOTS) {
    for (const source of sources) {
      const filepath = path.join(root, source);
      if (fs.existsSync(filepath)) {
        return filepath;
      }
    }
  }

  throw new Error(
    `Unable to find any @lynx-js/genui documentation source: ${sources.join(
      ', ',
    )}. Checked roots: ${GENUI_DOC_ROOTS.join(', ')}.`,
  );
}

function normalizeGenUIDocLinks(content: string, lang: GenUIDocPage['lang']) {
  const pageUrls = {
    a2ui: getGenUIDocUrl(lang, 'a2ui'),
    a2uiZh: getGenUIDocUrl('zh', 'a2ui'),
  };

  return content
    .replace(
      /A2UI rendering, OpenUI rendering, A2UI prompt\/catalog utilities, and the CLI/g,
      'A2UI rendering, A2UI prompt/catalog utilities, and the CLI',
    )
    .replace(/^\s*createOpenUiLibrary,\n\s*createStreamingParser,\n/gm, '')
    .replace(/^- OpenUI parser, library, and renderer APIs\.\n/gm, '')
    .replace(
      /^import \{ createOpenUiLibrary \} from '@lynx-js\/genui\/openui';\n/gm,
      '',
    )
    .replace(
      / New\nscripts should prefer the namespace-first `genui a2ui \.\.\.` form so OpenUI\ncommands can be added under `genui openui \.\.\.` later\./g,
      ' Prefer the namespace-first `genui a2ui ...` form for new scripts.',
    )
    .replace(/^## OpenUI[\s\S]*?(?=^## CLI)/m, '')
    .replace(
      /\[([^\]]+)\]\(\.\/openui\/(?:README_zh|readme_zh|README|readme)\.md\)/g,
      '$1',
    )
    .replace(
      /\[([^\]]+)\]\((?:\.\/)?(?:docs\/(?:architecture|catalogs|custom-components)(?:_zh)?|src\/catalog\/(?:README_zh|readme_zh|README|readme))\.md\)/g,
      '$1',
    )
    .replace(
      /\[([^\]]+)\]\(\.\.\/a2ui-playground\/examples\/(?:README_zh|readme_zh|README|readme)\.md\)/g,
      '$1',
    )
    .replace(/\]\(\.\/(?:README|readme)\.md\)/g, `](${pageUrls.a2ui})`)
    .replace(/\]\(\.\/(?:README_zh|readme_zh)\.md\)/g, `](${pageUrls.a2uiZh})`)
    .replace(/\]\(\.\/a2ui\/(?:README|readme)\.md\)/g, `](${pageUrls.a2ui})`)
    .replace(
      /\]\(\.\/a2ui\/(?:README_zh|readme_zh)\.md\)/g,
      `](${pageUrls.a2uiZh})`,
    );
}

function genuiDocsPlugin(): RspressPlugin {
  return {
    name: 'rspress:genui-docs',
    addPages() {
      return GENUI_DOC_PAGES.map((page) => {
        const filepath = resolveGenUIDocSource(page.sources);
        const content = fs.readFileSync(filepath, 'utf-8');

        return {
          routePath: page.routePath,
          content: normalizeGenUIDocLinks(content, page.lang),
        };
      });
    },
  };
}
