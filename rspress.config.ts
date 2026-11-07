// cspell:ignore shikijs
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { defineConfig, type RspressPlugin } from '@rspress/core';
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
import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  API_PARTIAL_ROUTE_EXCLUDE,
  assertNoApiPartialRoutes,
} from './scripts/build/api-partial-routes.mts';
import {
  normalizeGeneratedRoute,
  removeBrokenLanguageAlternates,
} from './scripts/build/generated-html.mts';
import { createLynxLlms } from './scripts/build/llms.mts';
import versionJson from './docs/public/version.json';
import { SITE_BASE } from './shared-route-config';
import { visit } from 'unist-util-visit';
import { pluginGoogleAnalytics } from 'rsbuild-plugin-google-analytics';

const PUBLISH_URL = 'https://lynxjs.org/';
const { llmsTxt, apiIndexPlugin } = createLynxLlms({
  publicDir: path.join(__dirname, 'docs', 'public'),
  siteOrigin: PUBLISH_URL,
});

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  outDir: 'doc_build',
  route: {
    exclude: [
      'lynx-compat-data/**/*',
      API_PARTIAL_ROUTE_EXCLUDE,
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
  ssg: {
    experimentalWorker: true,
  },
  builderConfig: {
    performance: {
      buildCache: false,
      // Avoid generating the file size report to reduce peak memory during build.
      printFileSize: false,
    },
    plugins: [
      pluginGoogleAnalytics({ id: 'G-WGP37JWP9M' }),
      // Open Graph / Twitter Card meta is injected per-page by the theme
      // (theme/OgHead.tsx) so each route gets its build-time OG image and
      // canonical URL. A global plugin here would emit a duplicate og:image.
      pluginSvgr(),
      pluginSass(),
      pluginLess(),
    ],
    resolve: {
      alias: {
        '@site': path.join(__dirname),
        '@og-config$': path.join(__dirname, 'shared-og-config.ts'),
        '@route-config$': path.join(__dirname, 'shared-route-config.ts'),
        '@version-data$': path.join(
          __dirname,
          'docs',
          'public',
          'version.json',
        ),
        '@': path.join(__dirname, 'src'),
        '@docs': path.join(__dirname, 'sharedDocs', 'packageDocs'),
        '@assets': path.join(__dirname, 'docs', 'public', 'assets'),
        '@lynx': path.join(__dirname, 'src', 'components'),
        '@api-status$': path.join(
          __dirname,
          'src',
          'components',
          'api-status',
          'index.ts',
        ),
        '@lynx-ui': path.join(__dirname, 'src', 'lynx-ui', 'components'),
        '@luna$': path.join(__dirname, 'src', 'luna', 'index.ts'),
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
  base: SITE_BASE,
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
        // Preserve locale/version prefixes for the former root-package page.
        {
          from: '^(.*)/lynxtron/api/@lynx-js/lynxtron/Variable\\.contextBridge(?:\\.html|\\.mdx)?/?$',
          to: '$1/lynxtron/api/@lynx-js/lynxtron/context-bridge/Variable.contextBridge.html',
        },
        {
          from: '/react/routing.html',
          to: '/react/routing/react-router.html',
        },
        // Tutorials moved out of Get Started into top-level /learn/<slug>.
        {
          from: '^/guide/start/tutorial-gallery(\\.html)?$',
          to: '/learn/gallery.html',
        },
        {
          from: '^/zh/guide/start/tutorial-gallery(\\.html)?$',
          to: '/zh/learn/gallery.html',
        },
        {
          from: '^/guide/start/tutorial-product-detail(\\.html)?$',
          to: '/learn/product-detail.html',
        },
        {
          from: '^/zh/guide/start/tutorial-product-detail(\\.html)?$',
          to: '/zh/learn/product-detail.html',
        },
        // The build-time macros page was removed: the public macros are covered
        // by the API reference, and the rest were implementation details.
        {
          from: '^/react/build-time-macros(\\.html)?$',
          to: '/api/react/Documents/Built-in_macros.html',
        },
        {
          from: '^/zh/react/build-time-macros(\\.html)?$',
          to: '/zh/api/react/Documents/Built-in_macros.html',
        },
        {
          from: '^/api/genui\\.html$',
          to: '/api/genui/index.html',
        },
        {
          from: '^/zh/api/genui\\.html$',
          to: '/zh/api/genui/index.html',
        },
        // The lynx-ui subsite moved from /lynx-ui to /ui. Netlify 301s in
        // netlify.toml cover server-side hits; these client rules keep every
        // old /lynx-ui link working on hosts without redirect support and for
        // SPA-side navigations. `to` preserves the captured tail via $1.
        {
          from: '^/lynx-ui(/.*)?$',
          to: '/ui$1',
        },
        {
          from: '^/zh/lynx-ui(/.*)?$',
          to: '/zh/ui$1',
        },
      ],
    }),
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
    apiIndexPlugin,
    pluginAlgolia({
      verificationContent: '6AD08DFB25B7234D',
    }),
    pluginValidateAndSanitizeGeneratedHtml(),
  ],
  markdown: {
    defaultWrapCode: false,
    // Replace "{versionJson.X}" placeholders inside fenced/inline code.
    // MDX does not evaluate JS expressions inside code fences, so without this
    // users would see the raw placeholder text in the rendered output.
    remarkPlugins: [remarkReplaceVersionJsonPlaceholders],
    link: {
      checkDeadLinks: {
        excludes: [
          '/guide/spec.html?ts=1743416098203#element%E2%91%A0',
          '/Components/Components/**',
        ],
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
  llms: { llmsTxt },
});

/**
 * Validates the production route set and repairs known generated HTML defects.
 *
 * This hook runs once in Node.js after a production build. It never ships to
 * the browser or executes during client-side navigation.
 */
function pluginValidateAndSanitizeGeneratedHtml(): RspressPlugin {
  return {
    name: 'validate-and-sanitize-generated-html',
    async afterBuild(config, isProd) {
      if (!isProd) {
        return;
      }
      const outDir = path.resolve(__dirname, config.outDir ?? 'doc_build');
      const files = await collectHtmlFiles(outDir);
      // Compare links against the generated route set because redirects,
      // locale prefixes, and the version base are resolved during the build.
      const routes = new Set(
        files.map((file) => routeForHtmlFile(outDir, file)),
      );
      assertNoApiPartialRoutes(routes);

      // Bound the whole read/repair/write operation: thousands of concurrent
      // HTML replacements can exceed the build's 4 GiB heap limit.
      const batchSize = 8;
      for (let offset = 0; offset < files.length; offset += batchSize) {
        await Promise.all(
          files.slice(offset, offset + batchSize).map(async (file) => {
            const html = await fs.readFile(file, 'utf8');
            let sanitized = html.replace(/\u0000/g, '');
            if (routeForHtmlFile(outDir, file) === '/living-spec') {
              // The generated living spec links to #ref, but the actual section
              // id in the built page is #references.
              sanitized = sanitized.replace(
                /href="#ref"/g,
                'href="#references"',
              );
            }
            sanitized = removeBrokenLanguageAlternates(sanitized, routes, {
              siteUrl: PUBLISH_URL,
              base: config.base ?? '/',
              pagePath: path.relative(outDir, file).replace(/\\/g, '/'),
            });
            if (sanitized !== html) {
              await fs.writeFile(file, sanitized);
            }
          }),
        );
      }
    },
  };
}

async function collectHtmlFiles(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectHtmlFiles(entryPath);
      if (entry.isFile() && entry.name.endsWith('.html')) return [entryPath];
      return [];
    }),
  );
  return nested.flat();
}

function routeForHtmlFile(root: string, file: string) {
  return normalizeGeneratedRoute(path.relative(root, file));
}

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
