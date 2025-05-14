import type { Configuration } from 'typedoc';
import type {
  MarkdownApplication,
  PluginOptions,
} from 'typedoc-plugin-markdown';

/**
 * Configuration customizable to a locale for TypeDoc documentation generation.
 * This includes entry points and any locale-specific TypeDoc options.
 */
type LocaleCustomizableConfig = {
  /** Entry point files to process for this locale */
  entryPoints?: string[];
  /** Extra options specific to this locale */
  options?: Partial<Configuration.TypeDocOptions> & Partial<PluginOptions>;
};

const LOCALE_KEYS = ['zh', 'en', 'shared'] as const;
type LocaleKey = (typeof LOCALE_KEYS)[number];

/**
 * Configuration for a package whose TypeScript declarations should be processed by TypeDoc
 */
export type PackageConfig = {
  /**
   * The relative path from root where docs will be generated.
   * @default 'api/{package-key}' if not specified.
   */
  out?: string;

  /**
   * Path to the tsconfig.json file that should be used when processing this package
   * @required
   */
  tsconfig: string;

  /**
   * Optional additional customization for the TypeDoc application
   */
  customize?: (app: MarkdownApplication, outputDir: string) => void;

  /** Whether to generate JSON output, defaults to false */
  generateJson?: boolean;
} & Partial<Record<LocaleKey, LocaleCustomizableConfig>>;
