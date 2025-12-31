import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import React from 'react';
import { APIItem } from './APIStatusDashboard';
import { PLATFORM_CONFIG } from './constants';
import type { APIInfo, CategoryStats, FeatureInfo } from './types';
import { CATEGORY_DISPLAY_NAMES, CLAY_PLATFORMS } from './types';

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
  selectedPlatforms?: PlatformName[];
  expandedCategory?: string | null;
  onCategoryClick?: (category: string) => void;
  highlightMode?: HighlightMode;
}

// Green mode: highlights high coverage (what's doing well)
// Higher coverage = more saturated/vibrant green, lower coverage = muted/gray
const getCoverageColorGreen = (coverage: number): string => {
  if (coverage >= 95)
    return 'bg-status-supported/25 text-status-supported-strong';
  if (coverage >= 85)
    return 'bg-status-supported/20 text-status-supported-strong';
  if (coverage >= 75)
    return 'bg-status-supported/15 text-status-supported-strong/90';
  if (coverage >= 65)
    return 'bg-status-supported/10 text-status-supported-strong/80';
  if (coverage >= 50) return 'bg-muted/50 text-muted-foreground/80';
  return 'bg-muted/30 text-muted-foreground/60';
};

// Red mode: highlights low coverage (what needs attention)
// Lower coverage = more saturated/vibrant red, higher coverage = muted/gray
const getCoverageColorRed = (coverage: number): string => {
  if (coverage < 50)
    return 'bg-status-unsupported/25 text-status-unsupported-strong';
  if (coverage < 65)
    return 'bg-status-unsupported/20 text-status-unsupported-strong';
  if (coverage < 75)
    return 'bg-status-unsupported/15 text-status-unsupported-strong/90';
  if (coverage < 85)
    return 'bg-status-unsupported/10 text-status-unsupported-strong/80';
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
    allSupported: 'All APIs supported on these platforms! 🎉',
    missingIn: 'Missing in',
  },
  zh: {
    allSupported: '这些平台已支持所有 API！🎉',
    missingIn: '缺失于',
  },
};

interface MissingAPIsRowProps {
  missingMap: Record<PlatformName, APIInfo[]>;
  colSpan: number;
  selectedPlatforms: PlatformName[];
  category: string;
}

const MissingAPIsRow: React.FC<MissingAPIsRowProps> = ({
  missingMap,
  colSpan,
  selectedPlatforms,
  category,
}) => {
  const lang = useLang();
  const texts = lang === 'zh' ? missingTexts.zh : missingTexts.en;

  // Check if any missing APIs exist across selected platforms
  const hasMissing = selectedPlatforms.some(
    (p) => missingMap[p] && missingMap[p].length > 0,
  );

  if (!hasMissing) {
    return (
      <tr>
        <td
          colSpan={colSpan}
          className="px-4 py-3 text-sm text-center bg-status-supported/5 text-status-supported-strong"
        >
          {texts.allSupported}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-3 bg-status-unsupported/5">
        <div className="space-y-4">
          {selectedPlatforms.map((platform) => {
            const missing = missingMap[platform];
            if (!missing || missing.length === 0) return null;

            const createMissingSupport = (): FeatureInfo['support'] => ({
              [platform]: { version_added: false },
            });

            return (
              <div key={platform}>
                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      PLATFORM_CONFIG[platform]?.colors.bg,
                    )}
                  />
                  {texts.missingIn}{' '}
                  {PLATFORM_CONFIG[platform]?.label || platform} (
                  {missing.length})
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {missing.map((api, index) => (
                    <APIItem
                      key={`${platform}-${api.path}-${index}`}
                      query={api.path}
                      name={api.name}
                      category={category}
                      selectedPlatforms={[platform]} // Show status for this platform specifically
                      support={createMissingSupport()}
                      compact
                      missing
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </td>
    </tr>
  );
};

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  showClay = false,
  selectedPlatforms = ['web_lynx'],
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

  // Use selectedPlatforms directly for columns
  const displayPlatforms = selectedPlatforms;

  const sortedCategories = categoryOrder
    .filter((cat) => categories[cat])
    .map((cat) => ({ key: cat, ...categories[cat] }));

  const colSpan = 3 + displayPlatforms.length;

  if (sortedCategories.length === 0) {
    return (
      <div className="p-4 text-center text-red-500">
        No categories found. Keys: {Object.keys(categories).join(', ')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" role="region" aria-label="Category Table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-8 px-2 py-3"></th>
            <th className="px-2 pr-1 text-xs font-semibold text-left sm:px-4 sm:py-3 sm:text-sm whitespace-nowrap">
              Category
            </th>
            <th className="px-3 py-3 font-mono text-xs font-semibold text-center whitespace-nowrap">
              Total
            </th>
            {displayPlatforms.map((platform) => (
              <th
                key={platform}
                className={cn(
                  'text-center font-semibold px-3 py-3 whitespace-nowrap text-xs',
                  CLAY_PLATFORMS.includes(platform) && 'bg-muted/30',
                )}
              >
                {PLATFORM_CONFIG[platform]?.label || platform}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedCategories.map(
            ({ key, stats, display_name, missing }, index) => {
              const isExpanded = expandedCategory === key;

              // Calculate missing count across all selected platforms
              const totalMissingCount = displayPlatforms.reduce((sum, p) => {
                return sum + (missing?.[p]?.length || 0);
              }, 0);

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
                    <td className="px-1 py-2 text-center sm:px-2 sm:py-3">
                      <ChevronRightIcon
                        className={cn(
                          'w-3 h-3 sm:w-4 sm:h-4 transition-transform text-muted-foreground',
                          isExpanded && 'rotate-90',
                        )}
                      />
                    </td>
                    <td className="px-2 py-2 pr-1 sm:px-4 sm:py-3">
                      <div className="flex flex-col min-w-0 gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-[11px] sm:text-sm font-medium whitespace-nowrap text-ellipsis overflow-hidden min-w-0">
                          {CATEGORY_DISPLAY_NAMES[key] || display_name}
                        </span>
                        {totalMissingCount > 0 && (
                          <span className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded bg-status-partial/20 text-status-partial-strong self-start whitespace-nowrap">
                            {totalMissingCount} gaps
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-center text-muted-foreground">
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
                          )}
                        >
                          <div
                            className={cn(
                              'inline-flex flex-col items-center rounded-md px-2 py-1 min-w-[50px]',
                              getCoverageColor(coverage, highlightMode),
                            )}
                          >
                            <span className="font-mono text-xs font-bold">
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
                      missingMap={missing as Record<PlatformName, APIInfo[]>}
                      colSpan={colSpan}
                      selectedPlatforms={selectedPlatforms}
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
          <tr className="font-semibold bg-muted/50 border-t-0">
            <td className="px-2 py-3"></td>
            <td className="px-4 py-3">Total</td>
            <td className="px-3 py-3 font-mono text-xs text-center">
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
                  )}
                >
                  <div
                    className={cn(
                      'inline-flex flex-col items-center rounded-md px-2 py-1 min-w-[50px]',
                      getCoverageColor(coverage, highlightMode),
                    )}
                  >
                    <span className="font-mono text-xs font-bold">
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
