import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import React from 'react';
import { APIItem } from './APIStatusDashboard';
import type { APIInfo, CategoryStats, FeatureInfo } from './types';
import {
  CATEGORY_DISPLAY_NAMES,
  CLAY_PLATFORMS,
  NATIVE_PLATFORMS,
  PLATFORM_DISPLAY_NAMES,
} from './types';

export type HighlightMode = 'green' | 'red';

interface CategoryTableProps {
  categories: Record<
    string,
    {
      stats: CategoryStats;
      display_name: string;
      missing?: Partial<Record<PlatformName, APIInfo[]>>;
    }
  >;
  showClay?: boolean;
  selectedPlatform?: string;
  expandedCategory?: string | null;
  onCategoryClick?: (category: string) => void;
  highlightMode?: HighlightMode;
}

// Green mode: highlights high coverage (what's doing well)
// Higher coverage = more saturated/vibrant green, lower coverage = muted/gray
const getCoverageColorGreen = (coverage: number): string => {
  if (coverage >= 95)
    return 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-300';
  if (coverage >= 85)
    return 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400';
  if (coverage >= 75)
    return 'bg-emerald-100/60 dark:bg-emerald-500/15 text-emerald-800/90 dark:text-emerald-400/80';
  if (coverage >= 65)
    return 'bg-emerald-100/40 dark:bg-emerald-500/10 text-emerald-800/80 dark:text-emerald-400/60';
  if (coverage >= 50) return 'bg-muted/50 text-muted-foreground/80';
  return 'bg-muted/30 text-muted-foreground/60';
};

// Red mode: highlights low coverage (what needs attention)
// Lower coverage = more saturated/vibrant red, higher coverage = muted/gray
const getCoverageColorRed = (coverage: number): string => {
  if (coverage < 50)
    return 'bg-red-100 dark:bg-red-500/25 text-red-900 dark:text-red-300';
  if (coverage < 65)
    return 'bg-red-100/80 dark:bg-red-500/20 text-red-800 dark:text-red-400';
  if (coverage < 75)
    return 'bg-red-100/60 dark:bg-red-500/15 text-red-800/90 dark:text-red-400/80';
  if (coverage < 85)
    return 'bg-red-100/40 dark:bg-red-500/10 text-red-800/80 dark:text-red-400/60';
  if (coverage < 95) return 'bg-muted/50 text-muted-foreground/80';
  return 'bg-muted/30 text-muted-foreground/60';
};

const getCoverageColor = (
  coverage: number,
  mode: HighlightMode = 'green',
): string => {
  return mode === 'red'
    ? getCoverageColorRed(coverage)
    : getCoverageColorGreen(coverage);
};

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// i18n for missing APIs section
const missingTexts = {
  en: {
    allSupported: 'All APIs supported on this platform! 🎉',
    andMore: 'and more missing APIs',
  },
  zh: {
    allSupported: '此平台已支持所有 API！🎉',
    andMore: '更多缺失的 API',
  },
};

interface MissingAPIsRowProps {
  missingApis: APIInfo[];
  colSpan: number;
  selectedPlatform: PlatformName;
  category: string;
}

const MissingAPIsRow: React.FC<MissingAPIsRowProps> = ({
  missingApis,
  colSpan,
  selectedPlatform,
  category,
}) => {
  const lang = useLang();
  const texts = lang === 'zh' ? missingTexts.zh : missingTexts.en;

  if (missingApis.length === 0) {
    return (
      <tr>
        <td
          colSpan={colSpan}
          className="px-4 py-3 bg-emerald-500/5 text-center text-sm text-emerald-700 dark:text-emerald-400"
        >
          {texts.allSupported}
        </td>
      </tr>
    );
  }

  // Create support object indicating missing on selected platform
  const createMissingSupport = (): FeatureInfo['support'] => {
    return {
      [selectedPlatform]: { version_added: false },
    };
  };

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-3 py-3 bg-red-500/5 dark:bg-red-500/10"
      >
        {/* Show ALL missing APIs - prioritize completeness over aesthetics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
          {missingApis.map((api, index) => (
            <APIItem
              key={`${api.path}-${index}`}
              query={api.path}
              name={api.name}
              category={category}
              selectedPlatform={selectedPlatform}
              support={createMissingSupport()}
              compact
              missing
            />
          ))}
        </div>
      </td>
    </tr>
  );
};

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  showClay = false,
  selectedPlatform = 'web_lynx',
  expandedCategory = null,
  onCategoryClick,
  highlightMode = 'green',
}) => {
  const categoryOrder = [
    'css/properties',
    'css/data-type',
    'css/at-rule',
    'elements',
    'lynx-api',
    'lynx-native-api',
    'react',
    'devtool',
    'errors',
  ];

  const displayPlatforms: PlatformName[] = showClay
    ? [...NATIVE_PLATFORMS, ...CLAY_PLATFORMS]
    : NATIVE_PLATFORMS;

  const sortedCategories = categoryOrder
    .filter((cat) => categories[cat])
    .map((cat) => ({ key: cat, ...categories[cat] }));

  const colSpan = 3 + displayPlatforms.length;

  // Debug: log category count
  if (sortedCategories.length === 0) {
    return (
      <div className="p-4 text-center text-red-500">
        No categories found. Keys: {Object.keys(categories).join(', ')}
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border bg-card"
      role="region"
      aria-label="Category Table"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-8 px-2 py-3"></th>
            <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
              Category
            </th>
            <th className="text-center font-semibold px-3 py-3 whitespace-nowrap font-mono text-xs">
              Total
            </th>
            {displayPlatforms.map((platform) => (
              <th
                key={platform}
                className={cn(
                  'text-center font-semibold px-3 py-3 whitespace-nowrap text-xs',
                  CLAY_PLATFORMS.includes(platform) && 'bg-muted/30',
                  platform === selectedPlatform && 'bg-primary/10',
                )}
              >
                {PLATFORM_DISPLAY_NAMES[platform]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedCategories.map(
            ({ key, stats, display_name, missing }, index) => {
              const isExpanded = expandedCategory === key;
              const missingApis =
                missing?.[selectedPlatform as PlatformName] || [];
              const missingCount = missingApis.length;

              return (
                <React.Fragment key={key}>
                  <tr
                    className={cn(
                      'border-b hover:bg-muted/30 transition-colors cursor-pointer',
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                      isExpanded && 'bg-muted/40',
                    )}
                    onClick={() => onCategoryClick?.(key)}
                  >
                    <td className="px-2 py-3 text-center">
                      <ChevronRightIcon
                        className={cn(
                          'w-4 h-4 transition-transform text-muted-foreground',
                          isExpanded && 'rotate-90',
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span>
                          {CATEGORY_DISPLAY_NAMES[key] || display_name}
                        </span>
                        {missingCount > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300">
                            {missingCount} missing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 font-mono text-muted-foreground text-xs">
                      {stats.total}
                    </td>
                    {displayPlatforms.map((platform) => {
                      const coverage = stats.coverage[platform] ?? 0;
                      const supported = stats.supported[platform] ?? 0;
                      return (
                        <td
                          key={platform}
                          className={cn(
                            'text-center px-2 py-2',
                            CLAY_PLATFORMS.includes(platform) && 'bg-muted/10',
                            platform === selectedPlatform && 'bg-primary/5',
                          )}
                        >
                          <div
                            className={cn(
                              'inline-flex flex-col items-center rounded-md px-2 py-1 min-w-[50px]',
                              getCoverageColor(coverage, highlightMode),
                            )}
                          >
                            <span className="font-bold font-mono text-xs">
                              {coverage}%
                            </span>
                            <span className="text-[9px] opacity-70">
                              {supported}/{stats.total}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {isExpanded && (
                    <MissingAPIsRow
                      missingApis={missingApis}
                      colSpan={colSpan}
                      selectedPlatform={selectedPlatform as PlatformName}
                      category={key}
                    />
                  )}
                </React.Fragment>
              );
            },
          )}
        </tbody>
        {/* Summary Row */}
        <tfoot>
          <tr className="border-t-2 bg-muted/50 font-semibold">
            <td className="px-2 py-3"></td>
            <td className="px-4 py-3">Total</td>
            <td className="text-center px-3 py-3 font-mono text-xs">
              {sortedCategories.reduce((sum, cat) => sum + cat.stats.total, 0)}
            </td>
            {displayPlatforms.map((platform) => {
              const totalSupported = sortedCategories.reduce(
                (sum, cat) => sum + (cat.stats.supported[platform] ?? 0),
                0,
              );
              const totalApis = sortedCategories.reduce(
                (sum, cat) => sum + cat.stats.total,
                0,
              );
              const coverage =
                totalApis > 0
                  ? Math.round((totalSupported / totalApis) * 100)
                  : 0;
              return (
                <td
                  key={platform}
                  className={cn(
                    'text-center px-2 py-2',
                    CLAY_PLATFORMS.includes(platform) && 'bg-muted/30',
                    platform === selectedPlatform && 'bg-primary/10',
                  )}
                >
                  <div
                    className={cn(
                      'inline-flex flex-col items-center rounded-md px-2 py-1 min-w-[50px]',
                      getCoverageColor(coverage, highlightMode),
                    )}
                  >
                    <span className="font-bold font-mono text-xs">
                      {coverage}%
                    </span>
                    <span className="text-[9px] opacity-70">
                      {totalSupported}/{totalApis}
                    </span>
                  </div>
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default CategoryTable;
