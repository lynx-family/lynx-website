import React from 'react';
import type LCD from '@lynx-js/lynx-compat-data';
import fs from 'fs';
import path from 'path';

const LCD_BASE_PATH = path.join(
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

    const parts: string[] = [];

    // Title
    parts.push(`**Compatibility Table**\n`);
    parts.push(`**Query:** \`${accessor}\`\n\n`);

    // Check if __compat exists
    if (!compatData.__compat) {
      return `**Error:** No compatibility data found for \`${accessor}\``;
    }

    const compat = compatData.__compat;

    // Status information
    if (compat.status) {
      const statuses: string[] = [];
      if (compat.status.experimental) statuses.push('🧪 Experimental');
      if (compat.status.deprecated) statuses.push('⚠️ Deprecated');
      if (statuses.length > 0) {
        parts.push(`**Status:** ${statuses.join(', ')}\n\n`);
      }
    }

    // MDN URL
    if (compat.mdn_url) {
      parts.push(
        `**MDN Reference:** [${compat.mdn_url}](${compat.mdn_url})\n\n`,
      );
    }

    // Spec URLs
    if (
      compat.spec_url &&
      Array.isArray(compat.spec_url) &&
      compat.spec_url.length > 0
    ) {
      parts.push(`**Specifications:**\n`);
      compat.spec_url.forEach((url) => {
        parts.push(`- [${url}](${url})\n`);
      });
      parts.push('\n');
    }

    // Support table
    if (compat.support) {
      parts.push(`**Platform Support**\n\n`);
      parts.push(`| Platform | Version Added | Notes |\n`);
      parts.push(`|----------|---------------|-------|\n`);

      const platforms = Object.keys(compat.support) as Array<
        keyof typeof compat.support
      >;

      for (const platform of platforms) {
        const supportData = compat.support[platform];
        const platformName = platformData.platforms[platform]?.name || platform;

        if (!supportData) continue;

        // Handle array of support statements
        const supportArray = Array.isArray(supportData)
          ? supportData
          : [supportData];

        for (const support of supportArray) {
          let versionInfo = '';

          if (typeof support.version_added === 'string') {
            versionInfo = support.version_added;
          } else if (support.version_added === true) {
            versionInfo = '✅ Yes';
          } else if (support.version_added === false) {
            versionInfo = '❌ No';
          } else if (support.version_added === null) {
            versionInfo = '❓ Unknown';
          }

          const notes: string[] = [];
          if (support.notes) {
            const noteText = Array.isArray(support.notes)
              ? support.notes.join('; ')
              : support.notes;
            notes.push(noteText);
          }
          if (support.prefix) {
            notes.push(`Prefix: \`${support.prefix}\``);
          }
          if (support.alternative_name) {
            notes.push(`Alternative name: \`${support.alternative_name}\``);
          }
          if (
            support.flags &&
            Array.isArray(support.flags) &&
            support.flags.length > 0
          ) {
            notes.push('Requires flags');
          }
          if (support.partial_implementation) {
            notes.push('⚠️ Partial implementation');
          }

          parts.push(
            `| ${platformName} | ${versionInfo} | ${notes.join('; ') || '-'} |\n`,
          );
        }
      }

      parts.push('\n');
    }

    // Description
    if (compat.description) {
      parts.push(`**Description:** ${compat.description}\n\n`);
    }

    return parts.join('');
  }, [compatData, platformData, accessor, query, module]);

  return <>{markdownContent}</>;
}
