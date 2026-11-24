import React from 'react';
import type * as LCD from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import fs from 'fs';
import path from 'path';
import { renderCompatMarkdown } from './compat-table/markdown';

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

    return renderCompatMarkdown(
      compatData,
      platformData.platforms,
      accessor,
      locale,
    );
  }, [compatData, platformData, accessor, query, locale]);

  return <>{markdownContent}</>;
}
