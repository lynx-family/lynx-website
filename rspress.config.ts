import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginLlms } from '@rspress/plugin-llms';
import { pluginRss } from '@rspress/plugin-rss';
import type { RspressPlugin, SidebarGroup } from '@rspress/shared';
import * as path from 'node:path';
import { pluginGoogleAnalytics } from 'rsbuild-plugin-google-analytics';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';
import { defineConfig } from 'rspress/config';
import {
  SHARED_DOC_FILES,
  SHARED_SIDEBAR_PATHS,
} from './shared-route-config.js';
import { transformerNotationHighlight } from '@shikijs/transformers';
import { transformerCompatibleMetaHighlight } from 'rspress/shiki-transformers';

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
  title: 'Lynx',
  description:
    'Empower the web community and invite more to build cross-platform apps',
  icon: '/assets/favicon.png',
  lang: 'en',
  globalStyles: path.join(__dirname, 'src', 'styles', 'global.css'),
  builderConfig: {
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
        '@site': path.join(__dirname),
        '@/': path.join(__dirname, 'src'),
        '@assets': path.join(__dirname, 'public', 'assets'),
        '@lynx': path.join(__dirname, 'src', 'components'),
      },
    },
    source: {
      include: [path.join(require.resolve('rspress'), '../')],
      define: {
        'process.env': {
          // This marks the first open sourced version of Lynx.
          OSS: '3.2',
          DOC_GIT_BASE_URL: JSON.stringify(
            'https://github.com/lynx-family/lynx-website/tree/main',
          ),
        },
      },
    },
  },
  logo: {
    light:
      'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-dark-logo.svg',
    dark: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-light-logo.svg',
  },
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
    pluginLlms(),
    rspeedyApiPlugin(),
    sharedSidebarPlugin(),
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
  ],
  markdown: {
    defaultWrapCode: false,
    checkDeadLinks: true,
    shiki: {
      transformers: [
        transformerCompatibleMetaHighlight(),
        transformerNotationHighlight(),
      ],
    },
  },
});

function rspeedyApiPlugin(): RspressPlugin {
  return {
    name: 'rspeedy:api',
    // FIXME: warning: this is hack to modify rspress.config in-place when autoNav generated
    async beforeBuild(config, isProd) {
      const {
        transformRspeedySidebar,
        transformReactRsbuildPluginSidebar,
        transformQrcodeRsbuildPluginSidebar,
      } = await import('./api-reports/index.js');
      config.themeConfig?.locales?.map((locale) => {
        if (locale.sidebar?.['/api']) {
          locale.sidebar!['/api'] =
            locale.sidebar?.['/api'].map((sidebar) => {
              if ('text' in sidebar && sidebar.text === 'lynx.config.js') {
                transformRspeedySidebar(sidebar as SidebarGroup);
              } else if (
                'text' in sidebar &&
                sidebar.text === '@lynx-js/react-rsbuild-plugin'
              ) {
                transformReactRsbuildPluginSidebar(sidebar as SidebarGroup);
              } else if (
                'text' in sidebar &&
                sidebar.text === '@lynx-js/qrcode-rsbuild-plugin'
              ) {
                transformQrcodeRsbuildPluginSidebar(sidebar as SidebarGroup);
              }
              return sidebar;
            }) ?? [];
        } else if (locale.sidebar?.[`/${locale.lang}/api`]) {
          locale.sidebar![`/${locale.lang}/api`] =
            locale.sidebar?.[`/${locale.lang}/api`].map((sidebar) => {
              if ('text' in sidebar && sidebar.text === 'lynx.config.js') {
                transformRspeedySidebar(sidebar as SidebarGroup, locale.lang);
              } else if (
                'text' in sidebar &&
                sidebar.text === '@lynx-js/react-rsbuild-plugin'
              ) {
                transformReactRsbuildPluginSidebar(
                  sidebar as SidebarGroup,
                  locale.lang,
                );
              } else if (
                'text' in sidebar &&
                sidebar.text === '@lynx-js/qrcode-rsbuild-plugin'
              ) {
                transformQrcodeRsbuildPluginSidebar(
                  sidebar as SidebarGroup,
                  locale.lang,
                );
              }
              return sidebar;
            }) ?? [];
        }
        return locale;
      });
    },
  };
}

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
