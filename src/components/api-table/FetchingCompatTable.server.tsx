import React from 'react';
import type * as LCD from '@lynx-js/lynx-compat-data';
import { useLang, useLocation, withBase } from '@rspress/core/runtime';
import fs from 'fs';
import path from 'path';
import { isCurrentDocPath, localizeMdnUrl } from './compat-table/links';
import { getCurrentSupport, versionIsPreview } from './compat-table/utils';

const LCD_BASE_PATH = path?.join?.(
  __dirname,
  '../../docs/public/lynx-compat-data',
);

/**
 * Retrieves a nested value from an object using a dot-separated query string.
 *
 * @param obj - The object to search within.
 * @param query - A dot-separated string representing the path to the desired value.
 * @returns The value at the specified path, or undefined if the path doesn't exist.
 *
 * @example
 * const obj = { a: { b: { c: 42 } } };
 * const value = getNestedValue(obj, 'a.b.c'); // Returns 42
 * const nonExistent = getNestedValue(obj, 'a.b.d'); // Returns undefined
 */
export function getNestedValue(obj: any, query: string): any {
  return query.split('.').reduce((acc, key) => {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

interface QueryJson {
  [key: string]: LCD.Identifier;
}

interface PlatformsJson {
  platforms: LCD.Platforms;
}

/**
 * Parses the query string into API module and object accessor parts.
 *
 * @param query - The query string to parse.
 * @returns An object containing the original query, API module and object accessor.
 *
 * @example
 * parseQuery("cat/api") // returns { query: "cat/api", module: "cat/api", accessor: "cat.api" }
 * parseQuery("cat/cat2/api") // returns { query: "cat/cat2/api", module: "cat/cat2/api", accessor: "cat.cat2.api" }
 * parseQuery("cat/cat2/cat3/api") // returns { query: "cat/cat2/cat3/api", module: "cat/cat2/cat3/api", accessor: "cat.cat2.cat3.api" }
 * parseQuery("cat/api.api2") // returns { query: "cat/api.api2", module: "cat/api", accessor: "cat.api.api2" }
 * parseQuery("cat/api.api2.api3") // returns { query: "cat/api.api2.api3", module: "cat/api", accessor: "cat.api.api2.api3" }
 */
const parseQuery = (
  query: string,
): { query: string; module: string; accessor: string } => {
  const parts = query.split('/');
  const lastPart = parts[parts.length - 1];
  const dotIndex = lastPart.indexOf('.');

  if (dotIndex === -1) {
    // No dot found in the last part, treat the whole query as the API module
    return {
      query,
      module: query,
      accessor: parts.join('.'),
    };
  } else {
    const module =
      parts.slice(0, -1).join('/') + '/' + lastPart.slice(0, dotIndex);
    const accessor = parts.join('.').replace(/\//g, '.');
    return { query, module, accessor };
  }
};

type FetchingCompatTableProps = {
  /**
   * The query to fetch the data from the server.
   * The query is formatted as a path to the `*.json` file in the `@lynx-js/lynx-compat-data` package,
   * with dot-separated object accessors.
   * @example `test/api` means the root identifier of `test/api.json`
   * @example `test/api.api_with_nested_api` means the `api_with_nested_api` identifier of `test/api.json`
   */
  query: string;
};

/**
 * This is a wrapper over the `CompatTable` component that dynamically
 * loads source code and fetches the data from the server-side file system.
 */
export function FetchingCompatTable({ query }: FetchingCompatTableProps) {
  const locale = useLang();
  const { pathname } = useLocation();

  // Use the utility function within useMemo
  const { module, accessor } = React.useMemo(() => parseQuery(query), [query]);

  // Load API data from file system
  const apiData = React.useMemo<QueryJson | null>(() => {
    try {
      const filePath = path.join(LCD_BASE_PATH, `${module}.json`);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as QueryJson;
    } catch {
      return null;
    }
  }, [module]);

  // Load platforms data from file system
  const platformData = React.useMemo<PlatformsJson | null>(() => {
    try {
      const filePath = path.join(LCD_BASE_PATH, 'platforms/platforms.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as PlatformsJson;
    } catch {
      return null;
    }
  }, []);

  // Get the nested compatibility data
  const compatData = React.useMemo(() => {
    if (!apiData) return null;
    return getNestedValue(apiData, accessor) as LCD.Identifier | undefined;
  }, [apiData, accessor]);

  // Generate Markdown content
  const markdownContent = React.useMemo(() => {
    if (!compatData || !platformData) {
      return `**Error:** Could not load compatibility data for \`${query}\``;
    }

    const platforms = platformData.platforms;
    const native: LCD.PlatformName[] = [];
    const clay: LCD.PlatformName[] = [];
    const web: LCD.PlatformName[] = [];
    const hideClay = Boolean(process.env.COMPAT_TABLE_HIDE_CLAY);
    for (const browser of Object.keys(platforms) as LCD.PlatformName[]) {
      if (browser.startsWith('clay_')) {
        if (!hideClay) clay.push(browser);
      } else if (platforms[browser].type === 'native') native.push(browser);
      else if (platforms[browser].type === 'web') web.push(browser);
    }
    if (hideClay) {
      if (platforms.clay_macos) native.push('clay_macos');
      if (platforms.clay_windows) native.push('clay_windows');
    }
    const visible = [...native, ...clay, ...web];
    const platformName = (browser: LCD.PlatformName) => {
      if (hideClay) {
        if (browser === 'clay_macos') return 'macOS';
        if (browser === 'clay_windows') return 'Windows';
      }
      return platforms[browser].name;
    };
    const escapeCell = (value: string) =>
      value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    const code = (value: string) => {
      const runs = value.match(/`+/g) ?? [];
      const fence = '`'.repeat(
        Math.max(0, ...runs.map((run) => run.length)) + 1,
      );
      const padding = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
      return `${fence}${padding}${value}${padding}${fence}`;
    };
    const link = (label: string, url: string) =>
      `[${label}](${url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')})`;
    const supportLabel = (
      support: LCD.SupportStatement | undefined,
      browser: LCD.PlatformName,
    ) => {
      const current = getCurrentSupport(support);
      if (!current || current.version_added === null) return 'Unknown';
      const added = current.version_added;
      const version =
        typeof added === 'string' && added !== 'preview' ? ` (${added})` : '';
      if (current.version_removed)
        return `Removed${typeof current.version_removed === 'string' ? ` in ${current.version_removed}` : ''}`;
      if (versionIsPreview(added, platforms[browser]))
        return `Preview${version}`;
      if (current.partial_implementation)
        return `Partial${version}${current.flags?.length ? '; requires flags' : ''}`;
      if (!added) return 'No';
      if (current.flags?.length) return `Requires flags${version}`;
      return `Yes${version}`;
    };

    const renderReferences = (identifier: LCD.Identifier) => {
      const compat = identifier.__compat;
      const sourceFile =
        (typeof identifier.source_file === 'string'
          ? identifier.source_file
          : undefined) || compat?.source_file;
      const sourceUrl =
        (typeof identifier.source_url === 'string'
          ? identifier.source_url
          : undefined) || compat?.source_url;
      const sourcePath = sourceFile
        ? `packages/lynx-compat-data/${sourceFile}`
        : `packages/lynx-compat-data/${module}.json`;
      const source =
        sourceUrl ||
        (sourcePath && process.env.DOC_GIT_BASE_URL
          ? `${process.env.DOC_GIT_BASE_URL}/${sourcePath}`
          : undefined);
      const lynxPath =
        (typeof identifier.lynx_path === 'string'
          ? identifier.lynx_path
          : undefined) || compat?.lynx_path;
      const references: string[] = [];
      if (source) references.push(link('Source', source));
      if (lynxPath && !isCurrentDocPath(pathname, lynxPath))
        references.push(link('API Reference', withBase(`/${lynxPath}`)));
      const mdnUrl = localizeMdnUrl(compat?.mdn_url, locale);
      if (mdnUrl) references.push(link('MDN', mdnUrl));
      return references.length ? `${references.join(' · ')}\n\n` : '';
    };

    const references = renderReferences(compatData);
    const rows: string[] = [];
    const details: string[] = [];
    const render = (identifier: LCD.Identifier, name: string) => {
      const compat = identifier.__compat;
      if (compat) {
        const feature = name || accessor.split('.').pop()!;
        rows.push(
          `| ${escapeCell(code(feature))} | ${visible.map((browser) => escapeCell(supportLabel(compat.support[browser], browser))).join(' | ')} |\n`,
        );

        const lines: string[] = [];
        if (compat.description) lines.push(`${compat.description}\n\n`);
        const statuses: string[] = [];
        if (compat.status?.experimental) statuses.push('Experimental');
        if (compat.status?.deprecated) statuses.push('Deprecated');
        if (statuses.length)
          lines.push(`**Status:** ${statuses.join(', ')}\n\n`);

        if (name) {
          const childReferences = renderReferences(identifier);
          if (childReferences !== references) lines.push(childReferences);
        }
        if (compat.spec_url) {
          const specs = Array.isArray(compat.spec_url)
            ? compat.spec_url
            : [compat.spec_url];
          lines.push(
            `**Specifications:**\n${specs.map((url) => `- ${link(url, url)}\n`).join('')}\n`,
          );
        }

        for (const browser of visible) {
          const support = compat.support[browser];
          if (!support) continue;
          const statements = Array.isArray(support) ? support : [support];
          for (const statement of statements) {
            const notes: string[] = [];
            if (statement.version_removed)
              notes.push(
                typeof statement.version_removed === 'string'
                  ? `Removed in ${statement.version_removed} and later`
                  : 'Removed (version unknown)',
              );
            if (statement.version_last)
              notes.push(
                typeof statement.version_last === 'string'
                  ? `Last supported version: ${statement.version_last}`
                  : 'Support ended (version unknown)',
              );
            if (statement.partial_implementation) notes.push('Partial support');
            if (statement.prefix)
              notes.push(`Prefix: ${code(statement.prefix)}`);
            if (statement.alternative_name)
              notes.push(`Alternate name: ${code(statement.alternative_name)}`);
            for (const flag of statement.flags ?? []) {
              const kind =
                flag.type === 'preference' ? 'preference' : 'runtime flag';
              notes.push(
                `Requires ${kind} ${code(flag.name)}${flag.value_to_set ? ` = ${code(flag.value_to_set)}` : ''}`,
              );
            }
            if (statement.notes)
              notes.push(
                ...(Array.isArray(statement.notes)
                  ? statement.notes
                  : [statement.notes]),
              );
            if (statement.impl_url) {
              const urls = Array.isArray(statement.impl_url)
                ? statement.impl_url
                : [statement.impl_url];
              notes.push(...urls.map((url) => link('Implementation', url)));
            }
            if (versionIsPreview(statement.version_added, platforms[browser]))
              notes.push('Preview platform support');
            if (!notes.length && statements.length === 1) continue;
            const added = statement.version_added;
            const version =
              typeof added === 'string'
                ? `From ${added}`
                : added === true
                  ? 'Supported (version unknown)'
                  : added === false
                    ? 'Not supported'
                    : 'Compatibility unknown';
            lines.push(
              `- **${platformName(browser)} — ${version}:** ${notes.join('; ') || (added ? 'Full support' : added === false ? 'No support' : 'Compatibility unknown')}\n`,
            );
          }
        }
        if (lines.length)
          details.push(
            `**${code(feature)}**\n\n${lines.join('').trimEnd()}\n\n`,
          );
      }
      for (const key in identifier) {
        if (
          key === '__compat' ||
          !Object.prototype.hasOwnProperty.call(identifier, key)
        )
          continue;
        const child = identifier[key];
        if (child && typeof child === 'object')
          render(child, name ? `${name}.${key}` : key);
      }
    };
    render(compatData, '');
    if (!rows.length)
      return `**Error:** No compatibility data found for \`${accessor}\``;
    return `**Compatibility Table**\n\n**Query:** ${code(accessor)}\n\n${references}| Feature | ${visible.map((browser) => escapeCell(platformName(browser))).join(' | ')} |\n| --- | ${visible.map(() => '---').join(' | ')} |\n${rows.join('')}\n${details.join('')}`;
  }, [compatData, platformData, accessor, module, query, locale, pathname]);

  return <>{markdownContent}</>;
}
