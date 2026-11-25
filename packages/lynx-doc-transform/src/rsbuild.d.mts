import type { RsbuildPlugin } from '@rsbuild/core';

export interface VersionBindingsOptions {
  /** Absolute path to the consuming site's version metadata JSON file. */
  versionFile: string;
  /** Exact absolute document paths whose code examples stay literal. */
  literalDocuments?: readonly string[];
}

export function pluginVersionBindings(
  options: VersionBindingsOptions,
): RsbuildPlugin;
