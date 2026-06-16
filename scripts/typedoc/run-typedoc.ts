import * as fs from 'node:fs';
import * as path from 'node:path';

import { Application, Configuration, TSConfigReader } from 'typedoc';
import type {
  MarkdownApplication,
  PluginOptions,
} from 'typedoc-plugin-markdown';
import { doGenDocData } from './utils/tpl-data.js';
import type { CliOptions } from './command.js';
import { PACKAGES } from './packages/index.js';
import { customize as defaultCustomize } from './themes/default.js';
import type { PackageConfig } from './types/PackageConfig.js';
import { doGenTplWithData } from './utils/tpl.js';

/**
 * This is the base configuration for typedoc-plugin-markdown.
 * @see https://typedoc-plugin-markdown.org/docs/options for explanation of those options.
 * @see https://typedoc-plugin-markdown.org/api-docs/Interface.PluginOptions
 */
const BASE_TYPEDOC_PLUGIN_MARKDOWN_OPTIONS: Partial<PluginOptions> = {
  fileExtension: '.mdx',
  flattenOutputFiles: true,
  entryFileName: 'index',
  mergeReadme: true,
  hidePageHeader: true,
  outputFileStrategy: 'members',
  useCodeBlocks: true,
  expandParameters: true,
  indexFormat: 'table',
  parametersFormat: 'table',
  interfacePropertiesFormat: 'list',
  classPropertiesFormat: 'list',
  // Drop the kind prefix from member page titles ("Function: foo" → "foo").
  // The breadcrumb, URL, and signature already convey the kind.
  textContentMappings: {
    'title.memberPage': '{name}',
  },
};

/**
 * This is the base configuration for typedoc.
 * @see https://typedoc.org/options/ for explanation of those options.
 * @see https://typedoc.org/api/interfaces/Configuration.TypeDocOptions.html#entryPoints
 *
 * @warning Not all TypeDoc options are supported.
 * @see https://typedoc-plugin-markdown.org/docs/typedoc-usage#output-options for compatibility
 */
const BASE_TYPEDOC_OPTIONS: Partial<Configuration.TypeDocOptions> = {
  plugin: ['typedoc-plugin-include-example', 'typedoc-plugin-markdown'],
  requiredToBeDocumented: ['Class', 'Function', 'Interface'],
  // Group members by kind, then alphabetically within a kind. Source-order
  // is unstable across re-exports and produces a random-looking index.
  sort: ['kind', 'alphabetical'],
  blockTags: [
    ...Configuration.OptionDefaults.blockTags,
    '@platform',
    // Going to be deprecated in favor of @platform but kept for suppressing warning.
    '@description',
    '@version',
    '@iOS',
    '@Android',
    '@Harmony',
    '@alias',
    '@a2uiCatalog',
    '@a2uiFunction',
  ],
};

/**
 * The canonical URL of the published docs site. Source READMEs and TSDoc
 * comments hardcode absolute links to this host; we rewrite them to
 * site-relative links so the generated docs stay portable and consistent with
 * the rest of the site (and don't 404 on preview/inhouse deployments).
 */
const SITE_URL = 'https://lynxjs.org';

/**
 * Rewrites markdown links pointing at the docs site itself
 * (`](https://lynxjs.org/...)`) into site-relative links (`](/...)`), dropping
 * a leading `/zh/` locale segment so links resolve to the reader's current
 * locale via rspress routing. Matches the long-standing hand-maintained
 * convention for these `@generated` files.
 *
 * `/living-spec/...` is intentionally left absolute: it's a static asset
 * (embedded via `<HtmlViewer>` elsewhere), not an rspress route, so a relative
 * link would be flagged as a dead link by the build. External links
 * (react.dev, github.com, ...) are left untouched.
 */
function rewriteSiteLinks(content: string): string {
  return content
    .replace(
      new RegExp(`\\]\\(${SITE_URL}/(?:zh/)?(?!living-spec/)`, 'g'),
      '](/',
    )
    .replace(new RegExp(`\\]\\(${SITE_URL}\\)`, 'g'), '](/)');
}

/**
 * Escapes MDX-breaking curly braces in prose. typedoc-plugin-markdown emits
 * `.mdx` but does not escape `{`/`}`, so brace literals in TSDoc comments
 * (e.g. `{queryFallbacks: true}`) make the MDX/acorn parser fail. We escape
 * braces outside of fenced code, inline code, and the leading JSX comment
 * block at the top of each file, where they are rendered as literal text.
 */
function escapeMdxBraces(content: string): string {
  const lines = content.split('\n');
  let inFence = false;
  let inHeaderComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.includes('{/*')) inHeaderComment = true;
    const skip = inHeaderComment;
    if (line.includes('*/}')) inHeaderComment = false;
    if (skip) continue;
    // Escape only outside inline-code spans (odd-indexed segments are code).
    const parts = line.split('`');
    for (let j = 0; j < parts.length; j += 2) {
      parts[j] = parts[j].replace(/\\?\{/g, '\\{').replace(/\\?\}/g, '\\}');
    }
    lines[i] = parts.join('`');
  }
  return lines.join('\n');
}

/**
 * Post-processes generated docs in place: normalize site links and escape
 * MDX-breaking braces so the output builds cleanly and doesn't require manual
 * fixups after each regeneration.
 */
function postProcessGeneratedDocs(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      postProcessGeneratedDocs(full);
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      const original = fs.readFileSync(full, 'utf8');
      let out = rewriteSiteLinks(original);
      if (entry.name.endsWith('.mdx')) out = escapeMdxBraces(out);
      if (out !== original) {
        fs.writeFileSync(full, out);
      }
    }
  }
}

/**
 * Generates TypeDoc documentation for a single package with the specified configuration.
 * This allows us to configure the TypeDoc application for each package and locale individually.
 *
 * @param packageName - Name of the package to generate docs for
 * @param packageConfig - Configuration for the package
 * @param outputRoot - The absolute path to the root output directory
 * @param locale - The locale to generate docs for
 * @returns Promise resolving to the configured TypeDoc application
 */
export async function runTypeDocForPackage(
  packageName: string,
  packageConfig: PackageConfig,
  outputRoot: string,
  locale: string,
): Promise<MarkdownApplication> {
  const { tsconfig } = packageConfig;

  const out = packageConfig.out ?? `api/${packageName}`;

  const localeConfig = packageConfig[locale];
  const sharedConfig = packageConfig.shared;

  // Merge entry points from shared and locale-specific configs
  const entryPoints = [
    ...(sharedConfig?.entryPoints ?? []),
    ...(localeConfig?.entryPoints ?? []),
  ];

  if (entryPoints.length === 0) {
    console.warn(
      `Warning: No entry points specified for package "${packageName}"`,
    );
  }

  const app = (await Application.bootstrapWithPlugins(
    {
      name: packageName,
      entryPoints,
      tsconfig,
      lang: locale,
      publicPath: `/${out}`,
      // Merge all options.
      ...BASE_TYPEDOC_OPTIONS,
      ...BASE_TYPEDOC_PLUGIN_MARKDOWN_OPTIONS,
      ...(sharedConfig?.options ?? {}),
      ...(localeConfig?.options ?? {}),
    },
    [new TSConfigReader()],
  )) as MarkdownApplication;

  const absoluteOutputDir = path.join(outputRoot, out);

  // Apply customizations - either package-specific or default
  if (packageConfig.customize) {
    // Package-specific customization
    packageConfig.customize(app, absoluteOutputDir);
  } else {
    // Default to default customization
    defaultCustomize(app, absoluteOutputDir);
  }

  const project = await app.convert();

  if (project) {
    if (packageConfig.generateJson) {
      const jsonGenRootPath = `scripts/typedoc/gen/${locale}`;

      const jsonDir = path.join(
        jsonGenRootPath,
        `./${project.name}`,
        './origin.json',
      );

      await app.generateJson(project, jsonDir);

      await doGenDocData(
        jsonDir,
        path.join(jsonGenRootPath, `./${project.name}`, './data.json'),
      );

      await doGenTplWithData(
        path.join(jsonGenRootPath, `./${project.name}`, './data.json'),
        path.join(jsonGenRootPath, `./${project.name}`, './tpl.mdx'),
      );
    }

    await app.generateDocs(project, absoluteOutputDir);

    // Normalize site links and escape MDX-breaking braces in the output.
    postProcessGeneratedDocs(absoluteOutputDir);
  }

  return app;
}

/**
 * Main entry point for TypeDoc documentation generation.
 * Generates documentation for specified packages in both English and Chinese.
 *
 * @param options - CLI options including package selection and working directory
 */
export async function runTypeDoc(options: CliOptions): Promise<void> {
  console.log(Object.entries(PACKAGES));
  console.log(options.packages);
  // Filter packages based on CLI options, or use all packages if none specified
  const packagesToGenerate = options.packages
    ? Object.entries(PACKAGES).filter(
        ([name]) =>
          options.packages?.includes(name) ||
          options.packages?.find((str) => name.startsWith(str)),
      )
    : Object.entries(PACKAGES);

  // Generate documentation for each package in both locales
  for (const [packageName, packageConfig] of packagesToGenerate) {
    await runTypeDocForPackage(
      packageName,
      packageConfig,
      path.join(options.cwd, 'docs/zh/'),
      'zh',
    );
    await runTypeDocForPackage(
      packageName,
      packageConfig,
      path.join(options.cwd, 'docs/en/'),
      'en',
    );
  }
}
