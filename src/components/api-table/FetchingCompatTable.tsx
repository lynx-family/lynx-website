import React, { lazy, Suspense } from 'react';
import useSWR from 'swr';
import Callout from '../Callout';
import EditThis from '../EditThis';
import { useLang, usePageData } from 'rspress/runtime';

// Because it's bad for web performance to lazy-load CSS during the initial render
// (because the page is saying "Wait! Stop rendering, now that I've downloaded
// some JS I decided I need more CSSOM to block the rendering.")
// Therefore, we import all the necessary CSS here in this file so that
// the LCD table CSS becomes part of the core bundle.
// That means that when the lazy-loading happens, it only needs to lazy-load
// the JS (and the JSON XHR fetch of course)
import './compat-table/index.scss';

import type LCD from '@lynx-js/lynx-compat-data';
const LCD_BASE_URL = '/lynx-compat-data';

function useIsServer() {
  return typeof window === 'undefined';
}

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

export function useTimeout(callback: React.EffectCallback, delay: number) {
  React.useEffect(() => {
    const timeout = setTimeout(callback, delay);
    return () => clearTimeout(timeout);
  }, [delay, callback]);
}

// Temporary loading component
function Loading({
  message = 'Loading…',
  delay = 600,
  minHeight = 200,
}: {
  message?: string;
  delay?: number;
  minHeight?: number;
}) {
  const [show, enableShow] = React.useReducer(() => true, false);
  useTimeout(enableShow, delay);
  const style = { minHeight };
  return (
    <Callout type="info" title="Loading">
      <p>{show ? message : ''}</p>
    </Callout>
  );
}

interface QueryJson {
  [key: string]: LCD.Identifier;
}

interface PlatformsJson {
  platforms: LCD.Platforms;
}

const CompatTable = lazy(
  () => import(/* webpackChunkName: "compatibility-table" */ './compat-table'),
);

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

function useLCDBaseUrl(): string {
  const { siteData } = usePageData();
  if (siteData.base !== '/') {
    return siteData.base + LCD_BASE_URL;
  } else {
    return LCD_BASE_URL;
  }
}

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
 * load source code and fetches the data from the server.
 */
export function FetchingCompatTable({ query }: FetchingCompatTableProps) {
  const locale = useLang();
  const isServer = useIsServer();
  const lcdBaseUrl = useLCDBaseUrl();

  // Use the utility function within useMemo
  const { module, accessor } = React.useMemo(() => parseQuery(query), [query]);

  // Fetching API data.
  const { error, data: apiData } = useSWR(
    module,
    async (_) => {
      const response = await fetch(`${lcdBaseUrl}/${module}.json`);
      if (!response.ok) {
        throw new Error(response.status.toString());
      }
      return (await response.json()) as QueryJson;
    },
    { revalidateOnFocus: false },
  );

  // Fetching platforms data.
  const { error: platformError, data: platformData } = useSWR(
    'platforms.json',
    async (_) => {
      const response = await fetch(`${lcdBaseUrl}/platforms/platforms.json`);
      if (!response.ok) {
        throw new Error(response.status.toString());
      }
      return (await response.json()) as PlatformsJson;
    },
    { revalidateOnFocus: false },
  );

  // If the user is on the server, return a message to the user.
  if (isServer) {
    return (
      <p>
        LCD tables only load in the browser
        <noscript>
          {' '}
          with JavaScript enabled. Enable JavaScript to view data.
        </noscript>
      </p>
    );
  }
  if (platformError) {
    return <p>Error loading LCD platforms data</p>;
  }
  if (error) {
    return (
      <Callout type="warning" title="Error Loading Data">
        <p>
          Error loading LCD data for query: <code>{query}</code>.<br />
          Please check if the file <code>{module}.json</code> exists in{' '}
          <code>@lynx-js/lynx-compat-data</code> and if the{' '}
          <code>{accessor}</code> field is present within it.
        </p>
      </Callout>
    );
  }
  if (!apiData || !platformData) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading message="Loading LCD table" />}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <EditThis path={`packages/lynx-compat-data/${module}.json`} />
        </div>
        <CompatTable
          locale={locale}
          query={accessor}
          data={getNestedValue(apiData, accessor)}
          browsers={platformData.platforms}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

type ErrorBoundaryProps = { children?: React.ReactNode };
type ErrorBoundaryState = {
  error: Error | null;
};

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  // componentDidCatch(error: Error, errorInfo) {
  //   console.log({ error, errorInfo });
  // }

  render() {
    if (this.state.error) {
      return (
        <Callout
          type="danger"
          title="Error loading browser compatibility table"
        >
          <p>
            This can happen if the JavaScript, which is loaded later, didn't
            successfully load.
          </p>
          <p>
            <a
              href="."
              onClick={(event) => {
                event.preventDefault();
                window.location.reload();
              }}
            >
              Try reloading the page
            </a>
          </p>
          <hr style={{ margin: 20 }} />
          <p>
            <small>If you're curious, this was the error:</small>
            <br />
            <small style={{ fontFamily: 'monospace' }}>
              {this.state.error.toString()}
            </small>
          </p>
        </Callout>
      );
    }

    return this.props.children;
  }
}
