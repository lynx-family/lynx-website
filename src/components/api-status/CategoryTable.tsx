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
    return 'sh-bg-emerald-100 dark:sh-bg-emerald-500/25 sh-text-emerald-900 dark:sh-text-emerald-300';
  if (coverage >= 85)
    return 'sh-bg-emerald-100/80 dark:sh-bg-emerald-500/20 sh-text-emerald-800 dark:sh-text-emerald-400';
  if (coverage >= 75)
    return 'sh-bg-emerald-100/60 dark:sh-bg-emerald-500/15 sh-text-emerald-800/90 dark:sh-text-emerald-400/80';
  if (coverage >= 65)
    return 'sh-bg-emerald-100/40 dark:sh-bg-emerald-500/10 sh-text-emerald-800/80 dark:sh-text-emerald-400/60';
  if (coverage >= 50) return 'sh-bg-muted/50 sh-text-muted-foreground/80';
  return 'sh-bg-muted/30 sh-text-muted-foreground/60';
};

// Red mode: highlights low coverage (what needs attention)
// Lower coverage = more saturated/vibrant red, higher coverage = muted/gray
const getCoverageColorRed = (coverage: number): string => {
  if (coverage < 50)
    return 'sh-bg-red-100 dark:sh-bg-red-500/25 sh-text-red-900 dark:sh-text-red-300';
  if (coverage < 65)
    return 'sh-bg-red-100/80 dark:sh-bg-red-500/20 sh-text-red-800 dark:sh-text-red-400';
  if (coverage < 75)
    return 'sh-bg-red-100/60 dark:sh-bg-red-500/15 sh-text-red-800/90 dark:sh-text-red-400/80';
  if (coverage < 85)
    return 'sh-bg-red-100/40 dark:sh-bg-red-500/10 sh-text-red-800/80 dark:sh-text-red-400/60';
  if (coverage < 95) return 'sh-bg-muted/50 sh-text-muted-foreground/80';
  return 'sh-bg-muted/30 sh-text-muted-foreground/60';
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
          className="sh-px-4 sh-py-3 sh-bg-emerald-500/5 sh-text-center sh-text-sm sh-text-emerald-700 dark:sh-text-emerald-400"
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
        className="sh-px-3 sh-py-3 sh-bg-red-500/5 dark:sh-bg-red-500/10"
      >
        {/* Show ALL missing APIs - prioritize completeness over aesthetics */}
        <div className="sh-grid sh-grid-cols-1 sm:sh-grid-cols-2 lg:sh-grid-cols-3 xl:sh-grid-cols-4 2xl:sh-grid-cols-5 sh-gap-1">
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
      <div className="sh-p-4 sh-text-center sh-text-red-500">
        No categories found. Keys: {Object.keys(categories).join(', ')}
      </div>
    );
  }

  return (
    <div
      className="sh-overflow-x-auto sh-rounded-lg sh-border sh-bg-card"
      role="region"
      aria-label="Category Table"
    >
      <table className="sh-w-full sh-text-sm">
        <thead>
          <tr className="sh-border-b sh-bg-muted/50">
            <th className="sh-w-8 sh-px-2 sh-py-3"></th>
            <th className="sh-text-left sh-font-semibold sh-px-4 sh-py-3 sh-whitespace-nowrap">
              Category
            </th>
            <th className="sh-text-center sh-font-semibold sh-px-3 sh-py-3 sh-whitespace-nowrap sh-font-mono sh-text-xs">
              Total
            </th>
            {displayPlatforms.map((platform) => (
              <th
                key={platform}
                className={cn(
                  'sh-text-center sh-font-semibold sh-px-3 sh-py-3 sh-whitespace-nowrap sh-text-xs',
                  CLAY_PLATFORMS.includes(platform) && 'sh-bg-muted/30',
                  platform === selectedPlatform && 'sh-bg-primary/10',
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
                      'sh-border-b hover:sh-bg-muted/30 sh-transition-colors sh-cursor-pointer',
                      index % 2 === 0 ? 'sh-bg-background' : 'sh-bg-muted/10',
                      isExpanded && 'sh-bg-muted/40',
                    )}
                    onClick={() => onCategoryClick?.(key)}
                  >
                    <td className="sh-px-2 sh-py-3 sh-text-center">
                      <ChevronRightIcon
                        className={cn(
                          'sh-w-4 sh-h-4 sh-transition-transform sh-text-muted-foreground',
                          isExpanded && 'sh-rotate-90',
                        )}
                      />
                    </td>
                    <td className="sh-px-4 sh-py-3 sh-font-medium">
                      <div className="sh-flex sh-items-center sh-gap-2">
                        <span>
                          {CATEGORY_DISPLAY_NAMES[key] || display_name}
                        </span>
                        {missingCount > 0 && (
                          <span className="sh-text-xs sh-px-1.5 sh-py-0.5 sh-rounded sh-bg-amber-100 dark:sh-bg-amber-500/20 sh-text-amber-900 dark:sh-text-amber-300">
                            {missingCount} missing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="sh-text-center sh-px-3 sh-py-3 sh-font-mono sh-text-muted-foreground sh-text-xs">
                      {stats.total}
                    </td>
                    {displayPlatforms.map((platform) => {
                      const coverage = stats.coverage[platform] ?? 0;
                      const supported = stats.supported[platform] ?? 0;
                      return (
                        <td
                          key={platform}
                          className={cn(
                            'sh-text-center sh-px-2 sh-py-2',
                            CLAY_PLATFORMS.includes(platform) &&
                              'sh-bg-muted/10',
                            platform === selectedPlatform && 'sh-bg-primary/5',
                          )}
                        >
                          <div
                            className={cn(
                              'sh-inline-flex sh-flex-col sh-items-center sh-rounded-md sh-px-2 sh-py-1 sh-min-w-[50px]',
                              getCoverageColor(coverage, highlightMode),
                            )}
                          >
                            <span className="sh-font-bold sh-font-mono sh-text-xs">
                              {coverage}%
                            </span>
                            <span className="sh-text-[9px] sh-opacity-70">
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
          <tr className="sh-border-t-2 sh-bg-muted/50 sh-font-semibold">
            <td className="sh-px-2 sh-py-3"></td>
            <td className="sh-px-4 sh-py-3">Total</td>
            <td className="sh-text-center sh-px-3 sh-py-3 sh-font-mono sh-text-xs">
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
                    'sh-text-center sh-px-2 sh-py-2',
                    CLAY_PLATFORMS.includes(platform) && 'sh-bg-muted/30',
                    platform === selectedPlatform && 'sh-bg-primary/10',
                  )}
                >
                  <div
                    className={cn(
                      'sh-inline-flex sh-flex-col sh-items-center sh-rounded-md sh-px-2 sh-py-1 sh-min-w-[50px]',
                      getCoverageColor(coverage, highlightMode),
                    )}
                  >
                    <span className="sh-font-bold sh-font-mono sh-text-xs">
                      {coverage}%
                    </span>
                    <span className="sh-text-[9px] sh-opacity-70">
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
