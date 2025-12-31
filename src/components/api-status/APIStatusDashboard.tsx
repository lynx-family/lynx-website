import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang, withBase } from '@rspress/core/runtime';
import React, { useMemo, useState } from 'react';
import APITable from '../api-table/APITable';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import { CategoryTable, type HighlightMode } from './CategoryTable';
import { PLATFORM_CONFIG } from './constants';
import type { APIStats, FeatureInfo, TimelinePoint } from './types';
import {
  CATEGORY_DISPLAY_NAMES,
  CLAY_PLATFORMS,
  NATIVE_PLATFORMS,
} from './types';

// Import the generated stats
import apiStats from '@lynx-js/lynx-compat-data/api-stats.json';

const stats = apiStats as APIStats;

// Icons - compact versions
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline
      points="22 7 13.5 15.5 8.5 10.5 2 17"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="16 7 22 7 22 13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LayersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12.5-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12.5" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const HelpCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" />
    <path d="M12 17h.01" strokeLinecap="round" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const i18n = {
  en: {
    title: 'Lynx API Status',
    subtitle: 'Real-time compatibility tracking across all Lynx platforms',
    totalApis: 'APIs',
    categoryBreakdown: 'Categories',
    recentApisTitle: 'Recently Added',
    parityOverTime: 'Trend',
    generatedAt: 'Updated',
    showClay: 'Clay',
    searchPlaceholder: 'Search APIs...',
    category: 'Category',
    state: 'State',
    all: 'All',
    supported: 'Supported',
    unsupported: 'Unsupported',
    openTable: 'Details',
    viewSource: 'Source',
    versionAdded: 'Version',
    showing: 'Showing',
    of: 'of',
    matches: 'results',
    apiList: 'API List',
    noResults: 'No APIs match the current filters',
    showAll: 'Show All',
    showLess: 'Show Less',
    highlightGood: 'Highlight Good',
    highlightBad: 'Highlight Gaps',
    help: 'Help',
  },
  zh: {
    title: 'Lynx API 大盘',
    subtitle: '实时追踪所有 Lynx 平台的 API 兼容性',
    totalApis: 'APIs',
    categoryBreakdown: '分类',
    recentApisTitle: '最近添加',
    parityOverTime: '趋势',
    generatedAt: '更新于',
    showClay: 'Clay',
    searchPlaceholder: '搜索 API...',
    category: '分类',
    state: '状态',
    all: '全部',
    supported: '已支持',
    unsupported: '未支持',
    openTable: '详情',
    viewSource: '源码',
    versionAdded: '版本',
    showing: '显示',
    of: '/',
    matches: '条结果',
    apiList: 'API 列表',
    noResults: '没有匹配当前筛选条件的 API',
    showAll: '显示全部',
    showLess: '收起',
    highlightGood: '高亮已支持',
    highlightBad: '高亮缺失',
    help: '帮助',
  },
};

// Platform icons - compact
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  const Icon = PLATFORM_CONFIG[platform]?.icon;
  return Icon ? <Icon className={className} /> : null;
};

// Unified API Item component - reused everywhere (exported for CategoryTable)
export interface APIItemProps {
  query: string;
  name: string;
  category: string;
  selectedPlatforms: PlatformName[];
  support: FeatureInfo['support'];
  compact?: boolean;
  missing?: boolean; // Style variant for missing APIs
}

// Category short names for badge display
const CATEGORY_SHORT_NAMES: Record<string, string> = {
  'css/properties': 'CSS',
  'css/data-type': 'CSS',
  'css/at-rule': 'CSS',
  elements: 'ELEMENT',
  'lynx-api': 'API',
  'lynx-native-api': 'NATIVE',
  react: 'REACT',
  devtool: 'DEVTOOL',
  errors: 'ERROR',
};

export const APIItem: React.FC<APIItemProps> = ({
  query,
  name,
  category,
  selectedPlatforms,
  support,
  compact = false,
  missing = false,
}) => {
  const isDesktop = useIsDesktop();

  // Calculate support status for each selected platform
  const platformSupportStatus = selectedPlatforms.map((platform) => {
    const platformSupport = support[platform];
    const versionAdded = platformSupport?.version_added;
    const isSupported =
      !missing &&
      versionAdded !== false &&
      versionAdded !== undefined &&
      versionAdded !== null;
    return { platform, isSupported };
  });

  // Aggregate support status
  const supportedCount = platformSupportStatus.filter(
    (p) => p.isSupported,
  ).length;
  const totalSelected = selectedPlatforms.length;
  const allSupported = supportedCount === totalSelected;
  const someSupported = supportedCount > 0 && supportedCount < totalSelected;
  const noneSupported = supportedCount === 0;

  // Get short category name for badge
  const categoryBadge =
    CATEGORY_SHORT_NAMES[category] ||
    category.split('/').pop()?.toUpperCase() ||
    'API';

  // Get display name - show full hierarchical path after category
  // e.g., for query "elements/frame.src", show "frame.src" not just "src"
  const getDisplayName = () => {
    // Extract the path after the category prefix
    // query format: "category/file.property.subproperty"
    const pathAfterSlash = query.split('/').pop() || query;

    // If path has a dot (nested property), always show the full path
    // e.g., "frame.src" shows as "frame.src", not just "src"
    if (pathAfterSlash.includes('.')) {
      return pathAfterSlash;
    }

    // For root-level items (like __compat entries), check if 'name' is actually a description
    // Descriptions are typically longer and contain spaces - use path-based name instead
    const isDescriptionLike = name && (name.length > 50 || name.includes(' '));
    if (isDescriptionLike) {
      return pathAfterSlash;
    }

    // Use the provided name if available and not a description
    // e.g., "common" might have name "commonality"
    return name || pathAfterSlash;
  };

  const displayName = getDisplayName();
  const hasHtmlContent =
    displayName.includes('<code>') || displayName.includes('&lt;');

  // Color scheme based on aggregate support status
  const colorClasses = allSupported
    ? 'bg-status-supported/15 text-status-supported-strong border-status-supported/30 hover:bg-status-supported/25'
    : someSupported
      ? 'bg-status-partial/15 text-status-partial-strong border-status-partial/30 hover:bg-status-partial/25'
      : 'bg-status-unsupported/15 text-status-unsupported-strong border-status-unsupported/30 hover:bg-status-unsupported/25';

  return (
    <Drawer direction={isDesktop ? 'right' : undefined}>
      <DrawerTrigger asChild>
        <button
          className={cn(
            'inline-flex flex-col gap-1 rounded-md font-medium transition-all duration-200',
            'border text-left cursor-pointer w-full',
            // Allow content to wrap - prioritize showing full content
            compact
              ? 'min-h-[36px] py-1.5 px-2.5 text-xs'
              : 'min-h-[40px] py-2 px-3 text-sm',
            colorClasses,
          )}
        >
          <div className="flex items-center gap-1.5 w-full">
            <span
              className={cn(
                'flex-shrink-0 font-semibold tracking-wider uppercase',
                compact ? 'text-[8px]' : 'text-[9px]',
              )}
            >
              {categoryBadge}
            </span>
            {hasHtmlContent ? (
              <span
                className="font-mono break-all leading-tight [&>code]:bg-current/10 [&>code]:px-0.5 [&>code]:rounded flex-1"
                dangerouslySetInnerHTML={{ __html: displayName }}
              />
            ) : (
              <code className="flex-1 font-mono leading-tight break-all">
                {displayName}
              </code>
            )}
            {/* Partial support indicator */}
            {someSupported && (
              <span className="ml-auto text-[9px] font-mono opacity-80 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 flex-shrink-0">
                {supportedCount}/{totalSelected}
              </span>
            )}
          </div>
          {/* Platform status badges - show when multiple platforms selected */}
          {selectedPlatforms.length > 1 && (
            <div className="flex flex-wrap gap-1 items-center">
              {platformSupportStatus.map(({ platform, isSupported }) => {
                const colors = PLATFORM_CONFIG[platform]?.colors;
                const Icon = PLATFORM_CONFIG[platform]?.icon;
                return (
                  <div
                    key={platform}
                    className={cn(
                      'flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px]',
                      isSupported
                        ? 'bg-status-supported/20 text-status-supported-strong'
                        : 'bg-status-unsupported/20 text-status-unsupported-strong',
                    )}
                    title={`${PLATFORM_CONFIG[platform]?.label || platform}: ${isSupported ? 'Supported' : 'Not supported'}`}
                  >
                    {Icon && <Icon className="w-2.5 h-2.5" />}
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSupported
                          ? 'bg-status-supported'
                          : 'bg-status-unsupported',
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          isDesktop ? 'h-full' : 'max-h-[85vh]',
          isDesktop && 'bg-zinc-50 dark:bg-zinc-900',
        )}
      >
        <div className="flex overflow-hidden flex-col p-5 w-full h-full grow">
          <DrawerHeader className="p-0 mb-4">
            <DrawerTitle className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              <code className="font-mono">{query}</code>
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-auto flex-1 pr-1">
            <APITable query={query} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// Interactive Parity Chart with hover
interface ParityChartProps {
  timeline: TimelinePoint[];
  selectedPlatforms: PlatformName[];
}

const ParityChart: React.FC<ParityChartProps> = ({
  timeline,
  selectedPlatforms,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeline || timeline.length < 2) return null;

  const w = 400;
  const h = 120;
  const padX = 32;
  const padY = 16;

  // Generate points for each platform
  const platformPoints = selectedPlatforms.map((platform) => {
    return {
      platform,
      points: timeline.map((t, i) => ({
        x: padX + (i * (w - padX * 2)) / Math.max(1, timeline.length - 1),
        y:
          padY +
          (1 - Math.min(1, (t.platforms[platform]?.coverage ?? 0) / 100)) *
            (h - padY * 2),
        version: t.version,
        coverage: t.platforms[platform]?.coverage ?? 0,
      })),
    };
  });

  const hovered =
    hoveredIndex !== null
      ? platformPoints.map((p) => ({
          platform: p.platform,
          point: p.points[hoveredIndex],
        }))
      : null;

  return (
    <div className="relative">
      <svg
        className="w-full h-[120px]"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Grid */}
        {[0, 50, 100].map((v) => {
          const y = padY + (1 - v / 100) * (h - padY * 2);
          return (
            <g key={v}>
              <line
                x1={padX}
                y1={y}
                x2={w - padX}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="1"
              />
              <text
                x={padX - 4}
                y={y + 3}
                fontSize="8"
                fill="currentColor"
                fillOpacity="0.4"
                textAnchor="end"
              >
                {v}%
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {platformPoints.map(({ platform, points }) => {
          const polyline = points
            .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
            .join(' ');
          const colors =
            PLATFORM_CONFIG[platform]?.colors ||
            PLATFORM_CONFIG.web_lynx.colors;

          return (
            <React.Fragment key={platform}>
              <polyline
                points={polyline}
                fill="none"
                stroke={colors.line}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
              {/* Interactive points */}
              {points.map((p, i) => (
                <g key={i} onMouseEnter={() => setHoveredIndex(i)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill="transparent"
                    className="cursor-pointer"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 4 : 2}
                    fill={colors.line}
                    className="transition-all"
                  />
                </g>
              ))}
            </React.Fragment>
          );
        })}

        {/* X axis labels */}
        <text
          x={padX}
          y={h - 4}
          fontSize="8"
          fill="currentColor"
          fillOpacity="0.4"
        >
          {timeline[0].version}
        </text>
        <text
          x={w - padX}
          y={h - 4}
          fontSize="8"
          fill="currentColor"
          fillOpacity="0.4"
          textAnchor="end"
        >
          {timeline[timeline.length - 1].version}
        </text>
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute z-10 px-2 py-1 text-xs rounded-md border shadow-lg pointer-events-none bg-popover"
          style={{
            left: hovered[0].point.x,
            top: 0,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-mono text-[10px] text-muted-foreground mb-1 border-b pb-1">
            v{hovered[0].point.version}
          </div>
          {hovered.map(({ platform, point }) => (
            <div key={platform} className="flex gap-2 items-center">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  PLATFORM_CONFIG[platform]?.colors.bg,
                )}
              />
              <span>{PLATFORM_CONFIG[platform]?.label || platform}</span>
              <span className="ml-auto font-mono font-semibold">
                {point.coverage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Dashboard
export const APIStatusDashboard: React.FC = () => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  // Global filter state - now uses multi-platform selection
  const [showClay, setShowClay] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformName[]>([
    'web_lynx',
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<
    'all' | 'supported' | 'unsupported'
  >('all');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showRecentApis, setShowRecentApis] = useState(true);
  const [showAllResults, setShowAllResults] = useState(false);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('green');

  const { summary, categories, recent_apis, features, timeline } = stats;
  const categoryOptions = ['all', ...Object.keys(categories)];

  // Toggle platform selection
  const togglePlatform = (platform: PlatformName) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
    setExpandedCategory(null);
  };

  // Helper to check if feature is supported on selected platforms
  const isFeatureSupported = (f: FeatureInfo): boolean => {
    // Using "any" mode - supported if at least one platform supports it
    return selectedPlatforms.some((platform) => {
      const support = f.support[platform];
      return (
        support?.version_added !== false &&
        support?.version_added !== undefined &&
        support?.version_added !== null
      );
    });
  };

  // Unified filtering for all API displays
  const filteredFeatures = useMemo(() => {
    if (!features) return [];
    const q = searchQuery.trim().toLowerCase();
    return features.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter)
        return false;
      if (
        q &&
        !f.query.toLowerCase().includes(q) &&
        !f.name.toLowerCase().includes(q)
      )
        return false;
      if (stateFilter !== 'all') {
        const isSupported = isFeatureSupported(f);
        if (stateFilter === 'supported' && !isSupported) return false;
        if (stateFilter === 'unsupported' && isSupported) return false;
      }
      return true;
    });
  }, [features, searchQuery, categoryFilter, stateFilter, selectedPlatforms]);

  // Convert recent_apis to FeatureInfo format for APIItem
  const recentApiFeatures: FeatureInfo[] = useMemo(() => {
    return recent_apis.map((api, i) => ({
      id: `recent-${i}`,
      query: api.path,
      name: api.name,
      category: api.category,
      support: Object.fromEntries(
        Object.entries(api.versions).map(([k, v]) => [k, { version_added: v }]),
      ) as FeatureInfo['support'],
    }));
  }, [recent_apis]);

  // Group recent APIs by version for the selected platforms (union)
  const recentApisByVersion = useMemo(() => {
    const grouped: Record<string, FeatureInfo[]> = {};
    const seenApis = new Set<string>();

    for (const api of recent_apis) {
      // Check if API has version on any selected platform
      const platformVersions = selectedPlatforms
        .map((p) => ({ platform: p, version: api.versions[p] }))
        .filter((pv) => pv.version && pv.version !== true);

      if (platformVersions.length === 0) continue;

      // Avoid duplicates
      if (seenApis.has(api.path)) continue;
      seenApis.add(api.path);

      // Use the highest version across selected platforms
      const maxVersion = platformVersions.reduce((max, pv) => {
        const v = String(pv.version);
        if (!max) return v;
        const parseVersion = (ver: string) => {
          const parts = ver.split('.').map(Number);
          return parts[0] * 1000 + (parts[1] || 0);
        };
        return parseVersion(v) > parseVersion(max) ? v : max;
      }, '');

      if (!maxVersion) continue;

      if (!grouped[maxVersion]) {
        grouped[maxVersion] = [];
      }

      grouped[maxVersion].push({
        id: `recent-${api.path}`,
        query: api.path,
        name: api.name,
        category: api.category,
        support: Object.fromEntries(
          Object.entries(api.versions).map(([k, v]) => [
            k,
            { version_added: v },
          ]),
        ) as FeatureInfo['support'],
      });
    }

    // Sort versions in descending order (newest first)
    const sortedVersions = Object.keys(grouped).sort((a, b) => {
      // Parse version strings like "3.5", "3.4", "1.6"
      const parseVersion = (v: string) => {
        const parts = v.split('.').map(Number);
        return parts[0] * 1000 + (parts[1] || 0);
      };
      return parseVersion(b) - parseVersion(a);
    });

    return sortedVersions.map((version) => ({
      version,
      apis: grouped[version],
    }));
  }, [recent_apis, selectedPlatforms]);

  // Show up to 100 features by default, or all if user requests
  const shownFeatures = showAllResults
    ? filteredFeatures
    : filteredFeatures.slice(0, 100);
  const hasMoreResults = filteredFeatures.length > 100;

  // For single platform, use that platform's colors; for multi, use primary
  const firstPlatform = selectedPlatforms[0] || 'web_lynx';
  const selectedColors =
    PLATFORM_CONFIG[firstPlatform]?.colors || PLATFORM_CONFIG.web_lynx.colors;
  const platformStats = summary.by_platform[firstPlatform];
  const generatedDate = new Date(stats.generated_at).toLocaleDateString(
    lang === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'short', day: 'numeric' },
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* ===== CONTROL PANEL ===== */}
        <div className="overflow-hidden rounded-xl border bg-card">
          {/* Header Row */}
          <div className="flex flex-col gap-2 justify-between items-start px-4 py-4 border-b sm:flex-row sm:items-center bg-muted/30">
            <div className="flex gap-3 items-center">
              <h1 className="text-lg font-semibold tracking-tight">
                {t.title}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono font-bold text-foreground">
                  {summary.total_apis.toLocaleString()}
                </span>
                <span>{t.totalApis}</span>
              </div>
            </div>
            <div className="flex gap-3 items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-3 h-3" />
                <span>
                  {t.generatedAt} {generatedDate}
                </span>
              </div>
              <a
                href={withBase(
                  lang === 'zh' ? '/zh/help/dashboard' : '/help/dashboard',
                )}
                className="flex gap-1 items-center px-2 py-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <HelpCircleIcon className="w-3.5 h-3.5" />
                <span>{t.help}</span>
              </a>
            </div>
          </div>

          {/* Filters Row */}
          <div className="p-4 space-y-3">
            {/* Platform Selector - Multi-select toggle buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Native Platforms */}
              {NATIVE_PLATFORMS.map((platform) => {
                const ps = summary.by_platform[platform];
                if (!ps) return null;
                const colors =
                  PLATFORM_CONFIG[platform]?.colors ||
                  PLATFORM_CONFIG.android.colors;
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                      'border-2',
                      isSelected
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-card border-transparent hover:border-muted-foreground/30',
                    )}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={cn(
                        'w-3 h-3 rounded border flex items-center justify-center transition-colors',
                        isSelected
                          ? `${colors.border} ${colors.bg}`
                          : 'border-muted-foreground/30',
                      )}
                    >
                      {isSelected && (
                        <svg
                          className={cn('w-2 h-2', colors.text)}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                        >
                          <polyline
                            points="20 6 9 17 4 12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <PlatformIcon
                      platform={platform}
                      className={cn('w-3.5 h-3.5', colors.text)}
                    />
                    <span>{PLATFORM_CONFIG[platform]?.label || platform}</span>
                    <span className={cn('font-mono', colors.text)}>
                      {ps.coverage_percent}%
                    </span>
                  </button>
                );
              })}

              {/* Separator on desktop */}
              <div className="hidden mx-1 w-px h-5 sm:block bg-border" />

              {/* Clay Toggle */}
              <button
                onClick={() => setShowClay(!showClay)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border-2',
                  showClay
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-card border-transparent text-muted-foreground hover:border-muted-foreground/30',
                )}
              >
                <svg
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    showClay ? 'text-primary' : 'text-muted-foreground',
                  )}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z" />
                </svg>
                <span>Clay</span>
                {showClay && (
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              {/* Clay Platforms - inline with others */}
              {showClay &&
                CLAY_PLATFORMS.map((platform) => {
                  const ps = summary.by_platform[platform];
                  if (!ps) return null;
                  const colors =
                    PLATFORM_CONFIG[platform]?.colors ||
                    PLATFORM_CONFIG.android.colors;
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                        'border-2',
                        isSelected
                          ? `${colors.bg} ${colors.border}`
                          : 'bg-card border-transparent hover:border-muted-foreground/30',
                      )}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={cn(
                          'w-3 h-3 rounded border flex items-center justify-center transition-colors',
                          isSelected
                            ? `${colors.border} ${colors.bg}`
                            : 'border-muted-foreground/30',
                        )}
                      >
                        {isSelected && (
                          <svg
                            className={cn('w-2 h-2', colors.text)}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                          >
                            <polyline
                              points="20 6 9 17 4 12"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <PlatformIcon
                        platform={platform}
                        className={cn('w-3.5 h-3.5', colors.text)}
                      />
                      <span>
                        {PLATFORM_CONFIG[platform]?.label || platform}
                      </span>
                      <span className={cn('font-mono', colors.text)}>
                        {ps.coverage_percent}%
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Search and Filters - search on own row on mobile, all in one row on desktop */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1 min-w-0">
                <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 font-mono text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                />
              </div>
              <div className="flex gap-2 items-center w-full sm:w-auto">
                <div className="flex-1 sm:flex-none sm:w-[130px]">
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t.category} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c === 'all' ? t.all : CATEGORY_DISPLAY_NAMES[c] || c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 sm:flex-none sm:w-[110px]">
                  <Select
                    value={stateFilter}
                    onValueChange={(v) => setStateFilter(v as any)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t.state} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        {t.all}
                      </SelectItem>
                      <SelectItem value="supported" className="text-xs">
                        {t.supported}
                      </SelectItem>
                      <SelectItem value="unsupported" className="text-xs">
                        {t.unsupported}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* API List - Filtered Results */}
            <div className="pt-3 mt-1 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.apiList}
                </span>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-muted-foreground">
                    {t.showing} {shownFeatures.length} {t.of}{' '}
                    {filteredFeatures.length} {t.matches}
                  </span>
                  {hasMoreResults && (
                    <button
                      onClick={() => setShowAllResults(!showAllResults)}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      {showAllResults ? t.showLess : t.showAll}
                    </button>
                  )}
                </div>
              </div>
              {shownFeatures.length === 0 ? (
                <div className="py-4 text-xs text-center rounded-md text-muted-foreground bg-muted/20">
                  {t.noResults}
                </div>
              ) : (
                <div
                  className={cn(
                    'grid overflow-y-auto grid-cols-1 gap-1 pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                    showAllResults ? 'max-h-[600px]' : 'max-h-[300px]',
                  )}
                >
                  {shownFeatures.map((f) => (
                    <APIItem
                      key={f.id}
                      query={f.query}
                      name={f.name}
                      category={f.category}
                      selectedPlatforms={selectedPlatforms}
                      support={f.support}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== STATS ROW ===== */}
        <div className="flex flex-col gap-4">
          {/* Platform Coverage Comparison */}
          {selectedPlatforms.length > 0 && (
            <Card className="overflow-hidden bg-transparent border-none shadow-none">
              <div className="flex gap-2 items-center px-1 mb-3">
                <div className="p-1 rounded bg-primary/10">
                  <svg
                    className="w-4 h-4 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 3v18h18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold">
                  Platform Coverage Comparison ({selectedPlatforms.length}{' '}
                  platforms)
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {selectedPlatforms.map((platform) => {
                  const ps = summary.by_platform[platform];
                  const colors =
                    PLATFORM_CONFIG[platform]?.colors ||
                    PLATFORM_CONFIG.web_lynx.colors;
                  return (
                    <div
                      key={platform}
                      className={cn(
                        'rounded-lg border p-3 flex flex-col gap-3 transition-all',
                        colors.bg,
                        colors.border,
                      )}
                    >
                      {/* Header */}
                      <div className="flex gap-2 items-center">
                        <PlatformIcon
                          platform={platform}
                          className={cn('w-4 h-4', colors.text)}
                        />
                        <span
                          className={cn('text-sm font-medium', colors.text)}
                        >
                          {PLATFORM_CONFIG[platform]?.label || platform}
                        </span>
                      </div>

                      {/* Stats */}
                      <div>
                        <div
                          className={cn(
                            'text-3xl font-bold font-mono leading-none mb-2',
                            colors.text,
                          )}
                        >
                          {ps?.coverage_percent}%
                        </div>
                        <Progress
                          value={ps?.coverage_percent || 0}
                          className="h-1.5 bg-black/5 dark:bg-white/10"
                          indicatorClassName={colors.progress}
                        />
                        <div className="mt-1.5 text-[10px] font-mono opacity-70 flex justify-between">
                          <span>
                            {ps?.supported_count.toLocaleString()} /{' '}
                            {summary.total_apis.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Trend Chart Card */}
          {timeline && timeline.length >= 2 && (
            <Card>
              <CardHeader className="px-4 py-2">
                <CardTitle className="flex gap-2 items-center text-sm font-medium">
                  <TrendingUpIcon className="w-4 h-4 text-primary" />
                  {t.parityOverTime}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pt-0 pb-2">
                <ParityChart
                  timeline={timeline}
                  selectedPlatforms={selectedPlatforms}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===== CATEGORY BREAKDOWN ===== */}
        <Card>
          <CardHeader className="px-4 py-2">
            <CardTitle className="flex justify-between items-center text-sm font-medium">
              <div className="flex gap-2 items-center">
                <LayersIcon className="w-4 h-4 text-primary" />
                {t.categoryBreakdown}
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
                <button
                  onClick={() => setHighlightMode('green')}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    highlightMode === 'green'
                      ? 'bg-status-supported/20 text-status-supported-strong'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.highlightGood}
                </button>
                <button
                  onClick={() => setHighlightMode('red')}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    highlightMode === 'red'
                      ? 'bg-status-unsupported/20 text-status-unsupported-strong'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.highlightBad}
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0 pb-0">
            <CategoryTable
              categories={categories}
              showClay={showClay}
              selectedPlatforms={selectedPlatforms}
              expandedCategory={expandedCategory}
              onCategoryClick={(cat) =>
                setExpandedCategory(expandedCategory === cat ? null : cat)
              }
              highlightMode={highlightMode}
            />
          </CardContent>
        </Card>

        {/* ===== RECENTLY ADDED ===== */}
        <Card>
          <CardHeader
            className="px-4 py-2 transition-colors cursor-pointer hover:bg-muted/30"
            onClick={() => setShowRecentApis(!showRecentApis)}
          >
            <CardTitle className="flex justify-between items-center text-sm font-medium">
              <div className="flex gap-2 items-center">
                <SparklesIcon className="w-4 h-4 text-primary" />
                {t.recentApisTitle}
                <span className="text-xs font-normal text-muted-foreground">
                  (
                  {recentApisByVersion.reduce(
                    (sum, g) => sum + g.apis.length,
                    0,
                  )}{' '}
                  for{' '}
                  {selectedPlatforms.length === 1
                    ? PLATFORM_CONFIG[firstPlatform]?.label || firstPlatform
                    : `${selectedPlatforms.length} platforms`}
                  )
                </span>
              </div>
              <svg
                className={cn(
                  'w-4 h-4 transition-transform',
                  showRecentApis && 'rotate-180',
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="m6 9 6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CardTitle>
          </CardHeader>
          {showRecentApis && (
            <CardContent className="px-4 pt-0 pb-4">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {recentApisByVersion.length === 0 ? (
                  <div className="py-4 text-sm text-center text-muted-foreground">
                    No recent APIs for{' '}
                    {selectedPlatforms.length === 1
                      ? PLATFORM_CONFIG[firstPlatform]?.label || firstPlatform
                      : `${selectedPlatforms.length} platforms`}
                  </div>
                ) : (
                  recentApisByVersion.map(({ version, apis }) => (
                    <div key={version}>
                      <div className="flex gap-2 items-center mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                          v{version}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {apis.length} APIs
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {apis.map((f) => (
                          <APIItem
                            key={f.id}
                            query={f.query}
                            name={f.name}
                            category={f.category}
                            selectedPlatforms={selectedPlatforms}
                            support={f.support}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default APIStatusDashboard;
