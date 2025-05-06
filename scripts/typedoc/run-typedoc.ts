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
  ],
};

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
