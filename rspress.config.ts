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
import * as path from 'node:path';
import versionJson from './docs/public/version.json';
import { visit } from 'unist-util-visit';
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
      include: [/[\\/]node_modules[\\/]@lynx-js[\\/]go-web[\\/]/],
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
  base: `/${versionJson.current_version}`,
  themeConfig: {
    editLink: {
      docRepoBaseUrl:
        'https://github.com/lynx-family/lynx-website/tree/main/docs',
    },
    enableContentAnimation: true,
    enableAppearanceAnimation: true,
    locales: [
      {
        lang: 'zh',
        title: 'Lynx',
        description: '帮助 Web 构建跨平台应用',
        label: '简体中文',
      },
      {
        lang: 'en',
        title: 'Lynx',
        description:
          'Empower the web community and invite more to build cross-platform apps',
        label: 'English',
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
    // Replace "{versionJson.X}" placeholders inside fenced/inline code.
    // MDX does not evaluate JS expressions inside code fences, so without this
    // users would see the raw placeholder text in the rendered output.
    remarkPlugins: [remarkReplaceVersionJsonPlaceholders],
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
  llms: true,
});

function remarkReplaceVersionJsonPlaceholders() {
  const replacements: Array<[string, string]> = [
    ['{versionJson.LYNX_VERSION}', String(versionJson.LYNX_VERSION ?? '')],
    ['{versionJson.PRIMJS_VERSION}', String(versionJson.PRIMJS_VERSION ?? '')],
  ];

  const applyReplacements = (input: string) => {
    let out = input;
    for (const [from, to] of replacements) {
      if (from && to) out = out.split(from).join(to);
    }
    return out;
  };

  return (tree: unknown) => {
    visit(tree as any, (node: any) => {
      if (
        (node?.type === 'code' || node?.type === 'inlineCode') &&
        typeof node.value === 'string'
      ) {
        node.value = applyReplacements(node.value);
      }
    });
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
