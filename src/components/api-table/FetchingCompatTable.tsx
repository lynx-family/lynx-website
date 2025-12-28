import React, { lazy, Suspense } from 'react';
import useSWR from 'swr';

import { useLang, withBase } from '@rspress/core/runtime';
import { FetchingCompatTable as FetchingCompatTableMarkdown } from './FetchingCompatTable.server';

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

const TableSkeleton = () => {
  return (
    <div className="w-full border rounded-lg overflow-hidden my-4 bg-card">
      <div className="h-10 bg-muted/30 border-b animate-pulse" />
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-8 bg-muted/20 rounded w-1/4 animate-pulse" />
            <div className="h-8 bg-muted/20 rounded w-3/4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

const TableError = ({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: React.ReactNode;
  onRetry?: () => void;
}) => {
  return (
    <div className="w-full border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-lg p-6 my-4 flex flex-col items-center justify-center text-center gap-3">
      <div className="text-red-500 dark:text-red-400">
        <svg
          className="w-10 h-10 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="font-semibold text-base text-red-900 dark:text-red-200">
        {title}
      </h3>
      <div className="text-sm text-red-600 dark:text-red-300/80 max-w-[500px] leading-relaxed">
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-200 rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

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
  return withBase(LCD_BASE_URL);
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
export function useDelayedLoading(
  isLoading: boolean,
  delay: number = 200,
): boolean {
  const [showLoading, setShowLoading] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      setShowLoading(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, delay]);

  return showLoading;
}

/**
 * This is a wrapper over the `CompatTable` component that dynamically
 * load source code and fetches the data from the server.
 */
export function FetchingCompatTable({ query }: FetchingCompatTableProps) {
  if (process.env.__SSR_MD__) {
    return <FetchingCompatTableMarkdown query={query} />;
  }
  const locale = useLang();
  const isServer = useIsServer();
  const lcdBaseUrl = useLCDBaseUrl();

  // Use the utility function within useMemo
  const { module, accessor } = React.useMemo(() => parseQuery(query), [query]);

  // Fetching API data.
  const {
    error,
    data: apiData,
    isLoading: isApiLoading,
  } = useSWR(
    module,
    async (_) => {
      // Simulate network delay for testing skeleton
      // await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch(`${lcdBaseUrl}/${module}.json`);
      if (!response.ok) {
        throw new Error(response.status.toString());
      }
      return (await response.json()) as QueryJson;
    },
    { revalidateOnFocus: false },
  );

  // Fetching platforms data.
  const {
    error: platformError,
    data: platformData,
    isLoading: isPlatformLoading,
  } = useSWR(
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

  const showSkeleton = useDelayedLoading(
    isApiLoading || isPlatformLoading,
    500,
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
    return (
      <TableError
        title="Platform Data Error"
        message="Failed to load platform configuration data. Please verify your network connection."
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (error) {
    return (
      <TableError
        title="Data Not Found"
        message={
          <>
            Error loading LCD data for query:{' '}
            <code className="text-xs bg-muted/50 p-1 rounded">{query}</code>.
            <br />
            Please check if the file{' '}
            <code className="text-xs bg-muted/50 p-1 rounded">
              {module}.json
            </code>{' '}
            exists in{' '}
            <code className="text-xs bg-muted/50 p-1 rounded">
              @lynx-js/lynx-compat-data
            </code>{' '}
            and if the{' '}
            <code className="text-xs bg-muted/50 p-1 rounded">{accessor}</code>{' '}
            field is present within it.
          </>
        }
      />
    );
  }
  if (!apiData || !platformData) {
    if (showSkeleton) {
      return <TableSkeleton />;
    }
    return null; // Don't show anything for the first 500ms
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<TableSkeleton />}>
        <CompatTable
          locale={locale}
          query={accessor}
          module={module}
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
        <TableError
          title="Component Error"
          message={
            <>
              Something went wrong while rendering the compatibility table.
              <br />
              <small className="font-mono mt-2 block opacity-75">
                {this.state.error.toString()}
              </small>
            </>
          }
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
