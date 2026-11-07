import type { RspressPlugin } from '@rspress/core';
import matter from 'gray-matter';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import release from '../../src/versioning/lynx-sdk-release.json';
import {
  isSdkSinceGuide,
  isSdkSinceLayout,
  parseSdkVersion,
  resolveSdkSince,
  validateSdkVersioning,
  type SdkVersioning,
} from '../../src/versioning/page-sdk-since';

/** Consume actual routes so excluded fragments never acquire page metadata. */
export async function validatePageSdkSince(
  files: string[],
  docsRoot: string,
  latestStable: unknown,
): Promise<void> {
  parseSdkVersion(latestStable, 'lynx-sdk-release.json: latestStable');
  const pairs = new Map<
    string,
    Map<string, { file: string; since: unknown }>
  >();
  const errors: string[] = [];

  for (const file of files) {
    const relativePath = path
      .relative(docsRoot, file)
      .split(path.sep)
      .join('/');
    if (!isSdkSinceGuide(relativePath)) continue;

    try {
      const { data } = matter(await readFile(file, 'utf8'), {
        engines: { javascript: () => ({}) },
      });
      if (data.since !== undefined && !isSdkSinceLayout(data.pageType)) {
        throw new Error('since requires a doc or doc-wide page layout');
      }
      resolveSdkSince(data.since, latestStable);

      const [locale, ...segments] = relativePath.split('/');
      const key = segments
        .join('/')
        .replace(/\.mdx?$/, '')
        .replace(/\/index$/, '');
      const pair = pairs.get(key) ?? new Map();
      pair.set(locale, { file, since: data.since });
      pairs.set(key, pair);
    } catch (error) {
      errors.push(`${file}: ${error instanceof Error ? error.message : error}`);
    }
  }

  for (const pair of pairs.values()) {
    const en = pair.get('en');
    const zh = pair.get('zh');
    if (en && zh && en.since !== zh.since) {
      errors.push(`${en.file} and ${zh.file}: since must match across locales`);
    }
  }
  if (errors.length) {
    throw new Error(`Invalid page SDK metadata:\n${errors.join('\n')}`);
  }
}

export function pluginPageSdkSince(
  docsRoot: string,
  options: SdkVersioning = release,
): RspressPlugin {
  const sdkVersioning = validateSdkVersioning({ ...options });
  return {
    name: 'page-sdk-since',
    config(config) {
      return {
        ...config,
        themeConfig: { ...config.themeConfig, sdkVersioning },
      };
    },
    async routeGenerated(routes) {
      await validatePageSdkSince(
        routes.map((route) => route.absolutePath),
        docsRoot,
        sdkVersioning.latestStable,
      );
    },
  };
}
