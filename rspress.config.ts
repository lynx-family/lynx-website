// cspell:ignore shikijs
import { pluginLLMsPostprocess } from '@lynx-js/rspress-plugin-llms-postprocess';
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
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
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import versionJson from './docs/public/version.json';
import { visit } from 'unist-util-visit';
import { pluginGoogleAnalytics } from 'rsbuild-plugin-google-analytics';

const PUBLISH_URL = 'https://lynxjs.org/';
const NETLIFY_CONTEXT = process.env.CONTEXT ?? '';
const IS_LIGHTWEIGHT_BUILD =
  process.env.RSPRESS_LIGHTWEIGHT_BUILD === 'true' ||
  NETLIFY_CONTEXT === 'deploy-preview';

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
      // Avoid generating the file size report to reduce peak memory during build.
      printFileSize: false,
    },
    plugins: [
      rsbuildPluginDisableFileSizeReport(),
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
        // be compatible to react@18, renderToMarkdownString within @rspress/core depends on react@19
        '@rspress/core/_private/react': path.join(
          __dirname,
          'node_modules/react-render-to-markdown/dist/index.js',
        ),
        '@site': path.join(__dirname),
        '@': path.join(__dirname, 'src'),
        '@docs': path.join(__dirname, 'sharedDocs', 'packageDocs'),
        '@assets': path.join(__dirname, 'docs', 'public', 'assets'),
        '@lynx': path.join(__dirname, 'src', 'components'),
        '@lynx-ui': path.join(__dirname, 'src', 'lynx-ui', 'components'),
        '@luna': path.join(__dirname, 'src', 'luna', 'index.ts'),
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
        {
          from: '^/api/genui\\.html$',
          to: '/api/genui/index.html',
        },
        {
          from: '^/zh/api/genui\\.html$',
          to: '/zh/api/genui/index.html',
        },
      ],
    }),
    ...(!IS_LIGHTWEIGHT_BUILD
      ? [
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
          pluginLLMsPostprocess(),
        ]
      : []),
    pluginAlgolia({
      verificationContent: '6AD08DFB25B7234D',
    }),
    pluginSanitizeGeneratedHtml(),
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
  llms: !IS_LIGHTWEIGHT_BUILD,
});

function rsbuildPluginDisableFileSizeReport() {
  return {
    name: 'disable-file-size-report',
    setup(api: RsbuildPluginApi) {
      api.modifyEnvironmentConfig((config) => {
        config.performance ??= {};
        config.performance.printFileSize = false;
        return config;
      });
    },
  };
}

// Some broken links are introduced only after Rspress renders the final HTML:
// generated spec content may contain NUL bytes, language alternates can point
// at missing localized routes, and living-spec emits one stale fragment link.
// Sanitize those generated artifacts here so the source docs stay unchanged.
function pluginSanitizeGeneratedHtml() {
  return {
    name: 'sanitize-generated-html',
    async afterBuild(config: { outDir?: string }) {
      const outDir = path.resolve(__dirname, config.outDir ?? 'doc_build');
      const files = await collectHtmlFiles(outDir);
      // Compare links against the generated route set because redirects,
      // locale prefixes, and the version base are resolved during the build.
      const routes = new Set(
        files.map((file) => routeForHtmlFile(outDir, file)),
      );

      await Promise.all(
        files.map(async (file) => {
          const html = await fs.readFile(file, 'utf8');
          let sanitized = html.replaceAll('\u0000', '');
          if (routeForHtmlFile(outDir, file) === '/living-spec') {
            // The generated living spec links to #ref, but the actual section
            // id in the built page is #references.
            sanitized = sanitized.replaceAll(
              'href="#ref"',
              'href="#references"',
            );
          }
          sanitized = removeBrokenAlternateLinks(sanitized, routes);
          if (sanitized !== html) {
            await fs.writeFile(file, sanitized);
          }
        }),
      );
    },
  };
}

async function collectHtmlFiles(dir: string): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
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

// Match the route shape Rspress serves for generated HTML files: both
// `foo.html` and `foo/index.html` resolve to `/foo`.
function normalizeGeneratedRoute(route: string) {
  let normalized = route.replace(/\\/g, '/');
  if (normalized.endsWith('.html')) normalized = normalized.slice(0, -5);
  normalized = normalized.replace(/\/index$/, '');
  if (normalized === 'index') normalized = '';
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '');
  return normalized || '/';
}

// Rspress renders alternate-language links even when the target locale page was
// not generated. Drop invalid head alternates and make visible switcher entries
// inert so crawlers and users do not follow missing routes.
function removeBrokenAlternateLinks(html: string, routes: Set<string>) {
  const withoutBrokenHeadLinks = html.replace(/<link\b[^>]*>/g, (tag) => {
    if (!/\brel=["']alternate["']/.test(tag)) return tag;
    const href = tag.match(/\bhref=["']([^"']+)["']/)?.[1];
    if (!isMissingGeneratedRoute(href, routes)) return tag;
    return '';
  });

  return withoutBrokenHeadLinks.replace(
    /<a\b(?=[^>]*\brel=["']alternate["'])[^>]*>[\s\S]*?<\/a>/g,
    (tag) => {
      const href = tag.match(/\bhref=["']([^"']+)["']/)?.[1];
      if (!isMissingGeneratedRoute(href, routes)) return tag;
      return tag
        .replace(/^<a\b/, '<span')
        .replace(/<\/a>$/, '</span>')
        .replace(/\s+href=["'][^"']*["']/, '')
        .replace(/\s+rel=["']alternate["']/, '')
        .replace(/\s+hrefLang=["'][^"']*["']/, '')
        .replace(
          /\s+class=["']([^"']*)\brp-link\b([^"']*)["']/,
          ' class="$1$2"',
        )
        .replace(/<span\b/, '<span aria-disabled="true"');
    },
  );
}

function isMissingGeneratedRoute(
  href: string | undefined,
  routes: Set<string>,
) {
  if (!href) return false;
  const route = routeFromGeneratedHref(href);
  return Boolean(route && !routes.has(route));
}

function routeFromGeneratedHref(href: string) {
  try {
    const url = new URL(href, PUBLISH_URL);
    if (url.origin !== new URL(PUBLISH_URL).origin) return null;
    let pathname = decodeURIComponent(url.pathname);
    // Alternate links include the published version base (`/next` today), but
    // generated routes are stored without that base.
    if (pathname.startsWith(`/${versionJson.current_version}`)) {
      pathname =
        pathname.slice(`/${versionJson.current_version}`.length) || '/';
    }
    return normalizeGeneratedRoute(pathname);
  } catch {
    return null;
  }
}

type RsbuildEnvironmentConfig = {
  performance?: {
    printFileSize?: boolean;
  };
};

type RsbuildPluginApi = {
  modifyEnvironmentConfig: (
    modify: (config: RsbuildEnvironmentConfig) => RsbuildEnvironmentConfig,
  ) => void;
};

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
