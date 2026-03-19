import { cn } from '@/lib/utils';
import { useLang } from '@rspress/core/runtime';
import React, { useState } from 'react';
import { APIItem } from './APIStatusDashboard';
import { PLATFORM_CONFIG } from './constants';
import type { APIInfo, CategoryStats, DisplayPlatformName } from './types';
import { CATEGORY_DISPLAY_NAMES, CLAY_PLATFORMS } from './types';

export type HighlightMode = 'green' | 'red';

interface CategoryTableProps {
  categories: Record<
    string,
    {
      stats: CategoryStats;
      display_name: string;
      missing?: Partial<Record<DisplayPlatformName, APIInfo[]>>;
      exclusive?: Partial<Record<DisplayPlatformName, APIInfo[]>>;
    }
  >;
  /** Which group each category belongs to: 'platform' or 'other'. */
  categoryGroups?: Record<string, 'platform' | 'other'>;
  selectedPlatforms?: DisplayPlatformName[];
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

// i18n
const texts = {
  en: {
    allSupported: 'All shared APIs are supported on these platforms!',
    gaps: 'gaps',
    gapsDesc: 'Shared APIs not yet supported',
    exclusive: 'platform-exclusive',
    exclusiveDesc: 'APIs unique to one platform',
    missingIn: 'Missing in',
    exclusiveIn: 'Exclusive to',
  },
  zh: {
    allSupported: '这些平台已支持所有共有 API！',
    gaps: '缺失',
    gapsDesc: '尚未支持的共有 API',
    exclusive: '独占',
    exclusiveDesc: '仅单一平台支持的 API',
    missingIn: '缺失于',
    exclusiveIn: '独占于',
  },
};

// Collapsible section for API lists
const CollapsibleAPISection: React.FC<{
  title: string;
  count: number;
  description: string;
  bgClass: string;
  platformColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({
  title,
  count,
  description,
  bgClass,
  platformColor,
  defaultOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;

  return (
    <div className={cn('rounded-md overflow-hidden', bgClass)}>
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <ChevronRightIcon
          className={cn(
            'w-3 h-3 transition-transform text-muted-foreground shrink-0',
            open && 'rotate-90',
          )}
        />
        {platformColor && (
          <div
            className={cn('w-1.5 h-1.5 rounded-full shrink-0', platformColor)}
          />
        )}
        <span className="text-xs font-semibold">
          {count} {title}
        </span>
        <span className="text-[10px] text-muted-foreground">{description}</span>
      </button>
      {open && <div className="px-3 pb-2 pt-0.5">{children}</div>}
    </div>
  );
};

interface ExpandedRowProps {
  missingMap?: Partial<Record<DisplayPlatformName, APIInfo[]>>;
  exclusiveMap?: Partial<Record<DisplayPlatformName, APIInfo[]>>;
  colSpan: number;
  selectedPlatforms: DisplayPlatformName[];
  category: string;
}

const ExpandedRow: React.FC<ExpandedRowProps> = ({
  missingMap,
  exclusiveMap,
  colSpan,
  selectedPlatforms,
  category,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? texts.zh : texts.en;

  const totalMissing = selectedPlatforms.reduce(
    (sum, p) => sum + (missingMap?.[p]?.length || 0),
    0,
  );
  const totalExclusive = selectedPlatforms.reduce(
    (sum, p) => sum + (exclusiveMap?.[p]?.length || 0),
    0,
  );

  if (totalMissing === 0 && totalExclusive === 0) {
    return (
      <tr>
        <td
          colSpan={colSpan}
          className="px-4 py-3 text-sm text-center bg-status-supported/5 text-status-supported-strong"
        >
          {t.allSupported}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-3 border-b">
        <div className="space-y-2">
          {/* Per-platform missing */}
          {selectedPlatforms.map((platform) => {
            const apis = missingMap?.[platform] || [];
            if (apis.length === 0) return null;
            return (
              <CollapsibleAPISection
                key={`missing-${platform}`}
                title={`${t.missingIn} ${PLATFORM_CONFIG[platform]?.label || platform}`}
                count={apis.length}
                description=""
                bgClass="bg-status-unsupported/5"
                platformColor={PLATFORM_CONFIG[platform]?.colors.bg}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {apis.map((api, index) => (
                    <APIItem
                      key={`${platform}-${api.path}-${index}`}
                      query={api.path}
                      name={api.name}
                      category={category}
                      selectedPlatforms={[platform]}
                      support={{ [platform]: { version_added: false } }}
                      compact
                      missing
                    />
                  ))}
                </div>
              </CollapsibleAPISection>
            );
          })}

          {/* Per-platform exclusive */}
          {selectedPlatforms.map((platform) => {
            const apis = exclusiveMap?.[platform] || [];
            if (apis.length === 0) return null;
            return (
              <CollapsibleAPISection
                key={`exclusive-${platform}`}
                title={`${t.exclusiveIn} ${PLATFORM_CONFIG[platform]?.label || platform}`}
                count={apis.length}
                description=""
                bgClass="bg-muted/30"
                platformColor={PLATFORM_CONFIG[platform]?.colors.bg}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {apis.map((api, index) => (
                    <APIItem
                      key={`${platform}-${api.path}-${index}`}
                      query={api.path}
                      name={api.name}
                      category={category}
                      selectedPlatforms={[platform]}
                      support={{ [platform]: { version_added: true } }}
                      compact
                    />
                  ))}
                </div>
              </CollapsibleAPISection>
            );
          })}
        </div>
      </td>
    </tr>
  );
};

// i18n for group headers
const groupTexts = {
  en: {
    platformApi: 'Lynx Platform API',
    other: 'Other',
    total: 'Total',
  },
  zh: {
    platformApi: 'Lynx 平台 API',
    other: '其他',
    total: '合计',
  },
};

// Render a single category row
const CategoryRow: React.FC<{
  catKey: string;
  stats: CategoryStats;
  displayName: string;
  missing?: Partial<Record<DisplayPlatformName, APIInfo[]>>;
  exclusive?: Partial<Record<DisplayPlatformName, APIInfo[]>>;
  displayPlatforms: DisplayPlatformName[];
  isExpanded: boolean;
  onCategoryClick?: (category: string) => void;
  highlightMode: HighlightMode;
  colSpan: number;
  selectedPlatforms: DisplayPlatformName[];
  rowIndex: number;
}> = ({
  catKey,
  stats,
  displayName,
  missing,
  exclusive,
  displayPlatforms,
  isExpanded,
  onCategoryClick,
  highlightMode,
  colSpan,
  selectedPlatforms,
  rowIndex,
}) => {
  const totalMissingCount = displayPlatforms.reduce(
    (sum, p) => sum + (missing?.[p]?.length || 0),
    0,
  );
  const totalExclusiveCount = displayPlatforms.reduce(
    (sum, p) => sum + (exclusive?.[p]?.length || 0),
    0,
  );

  return (
    <React.Fragment>
      <tr
        className={cn(
          'border-b hover:bg-muted/30 transition-colors cursor-pointer',
          rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10',
          isExpanded && 'bg-muted/40',
        )}
        onClick={() => onCategoryClick?.(catKey)}
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
              {CATEGORY_DISPLAY_NAMES[catKey] || displayName}
            </span>
            <div className="flex gap-1 self-start">
              {totalMissingCount > 0 && (
                <span className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded bg-status-partial/20 text-status-partial-strong whitespace-nowrap">
                  {totalMissingCount} gaps
                </span>
              )}
              {totalExclusiveCount > 0 && (
                <span className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground whitespace-nowrap">
                  {totalExclusiveCount} excl.
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-3 font-mono text-xs text-center text-muted-foreground">
          {stats.total}
        </td>
        {displayPlatforms.map((platform) => {
          const coverage = stats.coverage[platform];
          const isNA = coverage === null;
          const supported = stats.supported[platform] ?? 0;
          const excl = stats.exclusive?.[platform] ?? 0;
          return (
            <td
              key={platform}
              className={cn(
                'text-center px-2 py-2',
                (CLAY_PLATFORMS.includes(platform as any) ||
                  platform === 'clay') &&
                  'bg-muted/10',
              )}
            >
              {isNA ? (
                <div className="inline-flex flex-col items-center rounded-md px-2 py-1 min-w-[50px] bg-muted/20 text-muted-foreground/50">
                  <span className="font-mono text-xs font-medium">N/A</span>
                </div>
              ) : (
                <div
                  className={cn(
                    'inline-flex flex-col items-center rounded-md px-2 py-1 min-w-[50px]',
                    getCoverageColor(coverage ?? 0, highlightMode),
                  )}
                >
                  <span className="font-mono text-xs font-bold">
                    {coverage ?? 0}%
                  </span>
                  <span className="text-[9px] opacity-70">
                    {supported}/{stats.total}
                  </span>
                  {excl > 0 && (
                    <span className="text-[8px] opacity-50">+{excl} excl.</span>
                  )}
                </div>
              )}
            </td>
          );
        })}
      </tr>
      {isExpanded && (
        <ExpandedRow
          missingMap={missing}
          exclusiveMap={exclusive}
          colSpan={colSpan}
          selectedPlatforms={selectedPlatforms}
          category={catKey}
        />
      )}
    </React.Fragment>
  );
};

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  categoryGroups,
  selectedPlatforms = ['web_lynx'],
  expandedCategory = null,
  onCategoryClick,
  highlightMode = 'green',
}) => {
  const lang = useLang();
  const gt = lang === 'zh' ? groupTexts.zh : groupTexts.en;

  // Platform API categories first, then other
  const platformApiOrder = [
    'elements',
    'css/properties',
    'css/data-type',
    'css/at-rule',
    'lynx-api',
  ];
  const otherOrder = ['lynx-native-api', 'react', 'devtool', 'errors'];

  const displayPlatforms = selectedPlatforms;

  const makeCategoryList = (order: string[]) =>
    order
      .filter((cat) => categories[cat])
      .map((cat) => ({ key: cat, ...categories[cat] }));

  const platformApiCategories = makeCategoryList(platformApiOrder);
  const otherCategories = makeCategoryList(otherOrder);

  const colSpan = 3 + displayPlatforms.length;

  if (platformApiCategories.length === 0 && otherCategories.length === 0) {
    return (
      <div className="p-4 text-center text-red-500">
        No categories found. Keys: {Object.keys(categories).join(', ')}
      </div>
    );
  }

  // Group header row
  const GroupHeader: React.FC<{ label: string }> = ({ label }) => (
    <tr className="bg-muted/30">
      <td colSpan={colSpan} className="px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </td>
    </tr>
  );

  // Summary row for platform API group
  const PlatformApiSummary = () => (
    <tr className="font-semibold bg-muted/50 border-t border-b">
      <td className="px-2 py-3"></td>
      <td className="px-4 py-3">{gt.total}</td>
      <td className="px-3 py-3 font-mono text-xs text-center">
        {platformApiCategories.reduce((sum, cat) => sum + cat.stats.total, 0)}
      </td>
      {displayPlatforms.map((platform) => {
        // Only platform API categories, excluding N/A
        const applicable = platformApiCategories.filter(
          (cat) => cat.stats.coverage[platform] !== null,
        );
        const totalSupported = applicable.reduce(
          (sum, cat) => sum + (cat.stats.supported[platform] ?? 0),
          0,
        );
        const totalApis = applicable.reduce(
          (sum, cat) => sum + cat.stats.total,
          0,
        );
        const totalExclusive = applicable.reduce(
          (sum, cat) => sum + (cat.stats.exclusive?.[platform] ?? 0),
          0,
        );
        const coverage =
          totalApis > 0 ? Math.round((totalSupported / totalApis) * 100) : 0;
        return (
          <td
            key={platform}
            className={cn(
              'text-center px-2 py-2',
              (CLAY_PLATFORMS.includes(platform as any) ||
                platform === 'clay') &&
                'bg-muted/30',
            )}
          >
            <div
              className={cn(
                'inline-flex flex-col items-center rounded-md px-2 py-1 min-w-[50px]',
                getCoverageColor(coverage, highlightMode),
              )}
            >
              <span className="font-mono text-xs font-bold">{coverage}%</span>
              <span className="text-[9px] opacity-70">
                {totalSupported}/{totalApis}
              </span>
              {totalExclusive > 0 && (
                <span className="text-[8px] opacity-50">
                  +{totalExclusive} excl.
                </span>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );

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
                  (CLAY_PLATFORMS.includes(platform as any) ||
                    platform === 'clay') &&
                    'bg-muted/30',
                )}
              >
                {PLATFORM_CONFIG[platform]?.label || platform}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Lynx Platform API group */}
          <GroupHeader label={gt.platformApi} />
          {platformApiCategories.map(
            ({ key, stats, display_name, missing, exclusive }, index) => (
              <CategoryRow
                key={key}
                catKey={key}
                stats={stats}
                displayName={display_name}
                missing={missing}
                exclusive={exclusive}
                displayPlatforms={displayPlatforms}
                isExpanded={expandedCategory === key}
                onCategoryClick={onCategoryClick}
                highlightMode={highlightMode}
                colSpan={colSpan}
                selectedPlatforms={selectedPlatforms}
                rowIndex={index}
              />
            ),
          )}
          {/* Platform API subtotal */}
          <PlatformApiSummary />
          {/* Other group */}
          {otherCategories.length > 0 && (
            <>
              <GroupHeader label={gt.other} />
              {otherCategories.map(
                ({ key, stats, display_name, missing, exclusive }, index) => (
                  <CategoryRow
                    key={key}
                    catKey={key}
                    stats={stats}
                    displayName={display_name}
                    missing={missing}
                    exclusive={exclusive}
                    displayPlatforms={displayPlatforms}
                    isExpanded={expandedCategory === key}
                    onCategoryClick={onCategoryClick}
                    highlightMode={highlightMode}
                    colSpan={colSpan}
                    selectedPlatforms={selectedPlatforms}
                    rowIndex={index}
                  />
                ),
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;
