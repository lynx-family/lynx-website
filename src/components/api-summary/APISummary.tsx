import { cn } from '@/lib/utils';
import type LCD from '@lynx-js/lynx-compat-data';
import { usePageData, withBase } from '@rspress/core/runtime';
import React from 'react';
import useSWR from 'swr';
import { PLATFORM_CONFIG } from '../api-status/constants';
import { NATIVE_PLATFORMS } from '../api-status/types';

// Types
interface QueryJson {
  [key: string]: LCD.Identifier;
}

const LCD_BASE_URL = '/lynx-compat-data';

function useLCDBaseUrl(): string {
  return withBase(LCD_BASE_URL);
}

const parseQuery = (
  query: string,
): { query: string; module: string; accessor: string } => {
  const parts = query.split('/');
  const lastPart = parts[parts.length - 1];
  const dotIndex = lastPart.indexOf('.');

  if (dotIndex === -1) {
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

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CrossIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LimitedIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const BaselineIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

interface APISummaryProps {
  query?: string;
}

export function APISummary(props: APISummaryProps) {
  const { page } = usePageData();
  const frontmatter = page.frontmatter;

  let query = props.query;

  // If query is not provided, try to get it from frontmatter api
  if (!query) {
    if (frontmatter.api) {
      query = frontmatter.api as string;
    }
  }

  if (!query) {
    return null;
  }

  const compatHash = `#compat-table-${query.replace(/[\/.]/g, '-')}`;
  const lcdBaseUrl = useLCDBaseUrl();
  const { module, accessor } = React.useMemo(() => parseQuery(query), [query]);

  const { data, isLoading, error } = useSWR(
    module,
    async () => {
      // await new Promise(resolve => setTimeout(resolve, 3000));
      const response = await fetch(`${lcdBaseUrl}/${module}.json`);
      if (!response.ok) throw new Error(response.status.toString());
      return (await response.json()) as QueryJson;
    },
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="w-full h-[88px] border rounded-lg p-4 my-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <div className="w-10 h-10 rounded-full bg-muted/20 shrink-0" />
          <div className="space-y-2">
            <div className="w-32 h-5 rounded bg-muted/20" />
            <div className="w-48 h-3 rounded bg-muted/20" />
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-20 h-7 rounded-full bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  const feature = data
    ? accessor
        .split('.')
        .filter(Boolean)
        .reduce((obj: any, key) => obj?.[key], data)
    : null;

  if (error || !data || !feature || !feature['__compat']) {
    return (
      <div className="w-full h-[88px] border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-lg p-4 my-6 flex items-center justify-center gap-3 text-red-600 dark:text-red-400">
        <CrossIcon className="w-5 h-5" />
        <span className="text-sm font-medium">
          {error
            ? 'Failed to load compatibility data'
            : !data
              ? 'No data found'
              : 'Compatibility data not found for this feature'}
        </span>
      </div>
    );
  }

  const compatData = feature['__compat'] as LCD.CompatStatement;
  const support = compatData.support;
  const status = compatData.status;

  // Determine status
  // We consider "Widely available" if Android, iOS, and Web are supported.
  const corePlatforms: LCD.PlatformName[] = ['android', 'ios', 'web_lynx'];
  let maxVersion = 0;
  let hasUnknownVersion = false;

  const supportedCount = corePlatforms.reduce((count, p) => {
    const s = support[p];
    const version = Array.isArray(s) ? s[0].version_added : s?.version_added;

    if (version) {
      if (typeof version === 'string') {
        const v = parseFloat(version);
        if (!isNaN(v)) {
          maxVersion = Math.max(maxVersion, v);
        }
      } else if (version === true) {
        hasUnknownVersion = true;
      }
      return count + 1;
    }
    return count;
  }, 0);

  const isWidelyAvailable = supportedCount === corePlatforms.length;

  let title = isWidelyAvailable ? 'Widely available' : 'Limited availability';
  let description = isWidelyAvailable
    ? 'Supported across all major platforms'
    : 'Check compatibility for details';
  let bgColor = isWidelyAvailable
    ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : 'bg-zinc-100 dark:bg-zinc-800/50';
  let borderColor = isWidelyAvailable
    ? 'border-emerald-100 dark:border-emerald-900/30'
    : 'border-zinc-200 dark:border-zinc-700/50';
  let iconColor = isWidelyAvailable
    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
    : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400';
  let Icon = isWidelyAvailable ? BaselineIcon : LimitedIcon;
  (props: any) => (
    <div
      className="w-5 h-5 rounded-full border-2 border-current opacity-60 border-t-transparent"
      {...props}
    />
  );

  if (status?.deprecated) {
    title = 'Deprecated';
    description = 'This feature is no longer recommended.';
    bgColor = 'bg-red-50 dark:bg-red-900/20';
    borderColor = 'border-red-100 dark:border-red-900/30';
    iconColor = 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400';
    Icon = CrossIcon;
  } else if (status?.experimental) {
    title = 'Experimental';
    description = 'This feature is experimental and may change.';
    bgColor = 'bg-purple-50 dark:bg-purple-900/20';
    borderColor = 'border-purple-100 dark:border-purple-900/30';
    iconColor =
      'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400';
    // Use a Flask-like icon for experimental (simulated with BaselineIcon for now or add a new one)
    Icon = BaselineIcon;
  } else if (isWidelyAvailable && maxVersion > 0 && !hasUnknownVersion) {
    title = `Widely available since ${maxVersion}`;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(compatHash.substring(1));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Optional: update URL hash without triggering router scroll if needed
      // history.pushState(null, '', compatHash);
    }
  };

  return (
    <a
      href={compatHash}
      onClick={handleClick}
      className={cn(
        'flex flex-col gap-4 justify-between items-start p-4 my-6 w-full no-underline rounded-lg border transition-colors sm:flex-row sm:items-center hover:no-underline hover:bg-opacity-80',
        bgColor,
        borderColor,
      )}
    >
      {/* Left: Status Text */}
      <div className="flex gap-3 items-center">
        <div
          className={cn(
            'flex justify-center items-center w-10 h-10 rounded-full shrink-0',
            iconColor,
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="m-0 text-base font-bold leading-tight text-foreground">
            {title}
          </h3>
          <span className="text-xs text-muted-foreground mt-0.5 m-0 block">
            {description}
          </span>
        </div>
      </div>

      {/* Right: Platform Badges */}
      <div className="flex flex-wrap gap-2 items-center">
        {NATIVE_PLATFORMS.map((platform) => {
          const s = support[platform];
          const version = Array.isArray(s)
            ? s[0].version_added
            : s?.version_added;
          const isSupported = typeof version === 'string' || version === true;
          const config = PLATFORM_CONFIG[platform];

          if (!config) return null;

          const Icon = config.icon;

          return (
            <div
              key={platform}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors',
                isSupported
                  ? 'bg-background border-border shadow-sm'
                  : 'bg-muted/50 border-transparent opacity-60 grayscale',
              )}
              title={`${config.label}: ${
                isSupported ? `Supported (${version})` : 'Not supported'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="sr-only">{config.label}</span>
              {isSupported ? (
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <CrossIcon className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </a>
  );
}

export default APISummary;
