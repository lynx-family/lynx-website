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
import type { APIStats, FeatureInfo, TimelinePoint } from './types';
import {
  CATEGORY_DISPLAY_NAMES,
  CLAY_PLATFORMS,
  NATIVE_PLATFORMS,
  PLATFORM_DISPLAY_NAMES,
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
    title: 'Lynx API 状态',
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

// Platform colors
const platformColors: Record<
  string,
  { bg: string; border: string; text: string; progress: string; line: string }
> = {
  android: {
    bg: 'sh-bg-emerald-500/10',
    border: 'sh-border-emerald-500',
    text: 'sh-text-emerald-700 dark:sh-text-emerald-400',
    progress: 'sh-bg-emerald-500',
    line: '#10b981',
  },
  ios: {
    bg: 'sh-bg-blue-500/10',
    border: 'sh-border-blue-500',
    text: 'sh-text-blue-700 dark:sh-text-blue-400',
    progress: 'sh-bg-blue-500',
    line: '#3b82f6',
  },
  harmony: {
    bg: 'sh-bg-orange-500/10',
    border: 'sh-border-orange-500',
    text: 'sh-text-orange-700 dark:sh-text-orange-400',
    progress: 'sh-bg-orange-500',
    line: '#f97316',
  },
  web_lynx: {
    bg: 'sh-bg-purple-500/10',
    border: 'sh-border-purple-500',
    text: 'sh-text-purple-700 dark:sh-text-purple-400',
    progress: 'sh-bg-purple-500',
    line: '#a855f7',
  },
  clay_android: {
    bg: 'sh-bg-teal-500/10',
    border: 'sh-border-teal-500',
    text: 'sh-text-teal-700 dark:sh-text-teal-400',
    progress: 'sh-bg-teal-500',
    line: '#14b8a6',
  },
  clay_ios: {
    bg: 'sh-bg-cyan-500/10',
    border: 'sh-border-cyan-500',
    text: 'sh-text-cyan-700 dark:sh-text-cyan-400',
    progress: 'sh-bg-cyan-500',
    line: '#06b6d4',
  },
  clay_macos: {
    bg: 'sh-bg-indigo-500/10',
    border: 'sh-border-indigo-500',
    text: 'sh-text-indigo-700 dark:sh-text-indigo-400',
    progress: 'sh-bg-indigo-500',
    line: '#6366f1',
  },
  clay_windows: {
    bg: 'sh-bg-sky-500/10',
    border: 'sh-border-sky-500',
    text: 'sh-text-sky-700 dark:sh-text-sky-400',
    progress: 'sh-bg-sky-500',
    line: '#0ea5e9',
  },
};

// Platform icons - compact
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  const ClayIcon = (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z" />
    </svg>
  );
  const icons: Record<string, React.ReactNode> = {
    android: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.532 15.106a1.003 1.003 0 1 1 .001-2.006 1.003 1.003 0 0 1-.001 2.006zm-11.044 0a1.003 1.003 0 1 1 .001-2.006 1.003 1.003 0 0 1-.001 2.006zm11.4-6.018l2.006-3.459a.416.416 0 1 0-.721-.416l-2.032 3.505A12.192 12.192 0 0 0 12.001 7.9a12.19 12.19 0 0 0-5.142.818L4.828 5.213a.416.416 0 1 0-.722.416l2.006 3.461C2.651 11.095.436 14.762.046 18.997h23.909c-.39-4.235-2.606-7.901-6.067-9.909z" />
      </svg>
    ),
    ios: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    // HarmonyOS logo - "H" letterform
    harmony: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4v16" />
        <path d="M18 4v16" />
        <path d="M6 12h12" />
      </svg>
    ),
    // Web icon - code brackets
    web_lynx: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    clay_android: ClayIcon,
    clay_ios: ClayIcon,
    clay_macos: ClayIcon,
    clay_windows: ClayIcon,
  };
  return <>{icons[platform] || null}</>;
};

// Unified API Item component - reused everywhere (exported for CategoryTable)
export interface APIItemProps {
  query: string;
  name: string;
  category: string;
  selectedPlatform: PlatformName;
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
  selectedPlatform,
  support,
  compact = false,
  missing = false,
}) => {
  const platformSupport = support[selectedPlatform];
  const versionAdded = platformSupport?.version_added;
  const isSupported =
    !missing &&
    versionAdded !== false &&
    versionAdded !== undefined &&
    versionAdded !== null;

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

  // Color scheme based on support status
  const colorClasses = isSupported
    ? 'sh-bg-emerald-100 dark:sh-bg-emerald-500/10 sh-text-emerald-900 dark:sh-text-emerald-400 sh-border-emerald-200 dark:sh-border-emerald-500/20 hover:sh-bg-emerald-200 dark:hover:sh-bg-emerald-500/20'
    : 'sh-bg-red-100 dark:sh-bg-red-500/10 sh-text-red-900 dark:sh-text-red-400 sh-border-red-200 dark:sh-border-red-500/20 hover:sh-bg-red-200 dark:hover:sh-bg-red-500/20';

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          className={cn(
            'sh-inline-flex sh-items-center sh-gap-1.5 sh-rounded-md sh-font-medium sh-transition-all sh-duration-200',
            'sh-border sh-text-left sh-cursor-pointer sh-w-full',
            // Allow content to wrap - prioritize showing full content
            compact
              ? 'sh-min-h-[36px] sh-py-1.5 sh-px-2.5 sh-text-xs'
              : 'sh-min-h-[40px] sh-py-2 sh-px-3 sh-text-sm',
            colorClasses,
          )}
        >
          <span
            className={cn(
              'sh-font-semibold sh-uppercase sh-tracking-wider sh-flex-shrink-0',
              compact ? 'sh-text-[8px]' : 'sh-text-[9px]',
            )}
          >
            {categoryBadge}
          </span>
          {hasHtmlContent ? (
            <span
              className="sh-font-mono sh-break-all sh-leading-tight [&>code]:sh-bg-current/10 [&>code]:sh-px-0.5 [&>code]:sh-rounded"
              dangerouslySetInnerHTML={{ __html: displayName }}
            />
          ) : (
            <code className="sh-font-mono sh-break-all sh-leading-tight">
              {displayName}
            </code>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="sh-max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="sh-text-base">
            <code className="sh-font-mono">{query}</code>
          </DrawerTitle>
        </DrawerHeader>
        <div className="sh-px-4 sh-pb-6 sh-overflow-auto">
          <APITable query={query} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// Interactive Parity Chart with hover
interface ParityChartProps {
  timeline: TimelinePoint[];
  selectedPlatform: PlatformName;
}

const ParityChart: React.FC<ParityChartProps> = ({
  timeline,
  selectedPlatform,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeline || timeline.length < 2) return null;

  const w = 400;
  const h = 120;
  const padX = 32;
  const padY = 16;

  const points = timeline.map((t, i) => ({
    x: padX + (i * (w - padX * 2)) / Math.max(1, timeline.length - 1),
    y:
      padY +
      (1 - Math.min(1, (t.platforms[selectedPlatform]?.coverage ?? 0) / 100)) *
        (h - padY * 2),
    version: t.version,
    coverage: t.platforms[selectedPlatform]?.coverage ?? 0,
  }));

  const polyline = points
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  const colors = platformColors[selectedPlatform] || platformColors.web_lynx;
  const lastPoint = points[points.length - 1];
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="sh-relative">
      <svg
        className="sh-w-full sh-h-[120px]"
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

        {/* Area fill */}
        <polygon
          points={`${padX},${h - padY} ${polyline} ${points[points.length - 1].x},${h - padY}`}
          fill={colors.line}
          fillOpacity="0.1"
        />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive points */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoveredIndex(i)}>
            <circle
              cx={p.x}
              cy={p.y}
              r="12"
              fill="transparent"
              className="sh-cursor-pointer"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 5 : 3}
              fill={colors.line}
              className="sh-transition-all"
            />
          </g>
        ))}

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
          {lastPoint.version}
        </text>

        {/* Current label */}
        <text
          x={lastPoint.x + 4}
          y={lastPoint.y + 3}
          fontSize="10"
          fill={colors.line}
          fontWeight="600"
        >
          {lastPoint.coverage}%
        </text>
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="sh-absolute sh-bg-popover sh-border sh-rounded-md sh-px-2 sh-py-1 sh-text-xs sh-shadow-lg sh-pointer-events-none"
          style={{
            left: hovered.x,
            top: hovered.y - 30,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="sh-font-mono sh-font-semibold">
            {hovered.coverage}%
          </span>
          <span className="sh-text-muted-foreground sh-ml-1">
            v{hovered.version}
          </span>
        </div>
      )}
    </div>
  );
};

// Main Dashboard
export const APIStatusDashboard: React.FC = () => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  // Global filter state
  const [showClay, setShowClay] = useState(false);
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformName>('web_lynx');
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
        const support = f.support[selectedPlatform];
        const isSupported =
          support?.version_added !== false &&
          support?.version_added !== undefined &&
          support?.version_added !== null;
        if (stateFilter === 'supported' && !isSupported) return false;
        if (stateFilter === 'unsupported' && isSupported) return false;
      }
      return true;
    });
  }, [features, searchQuery, categoryFilter, stateFilter, selectedPlatform]);

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

  // Group recent APIs by version for the selected platform
  const recentApisByVersion = useMemo(() => {
    const grouped: Record<string, FeatureInfo[]> = {};

    for (const api of recent_apis) {
      const version = api.versions[selectedPlatform];
      // Skip if no version for selected platform or version is false/null
      if (!version || version === true) continue;

      const versionKey = String(version);
      if (!grouped[versionKey]) {
        grouped[versionKey] = [];
      }

      grouped[versionKey].push({
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
  }, [recent_apis, selectedPlatform]);

  // Show up to 100 features by default, or all if user requests
  const shownFeatures = showAllResults
    ? filteredFeatures
    : filteredFeatures.slice(0, 100);
  const hasMoreResults = filteredFeatures.length > 100;
  const selectedColors =
    platformColors[selectedPlatform] || platformColors.web_lynx;
  const platformStats = summary.by_platform[selectedPlatform];
  const generatedDate = new Date(stats.generated_at).toLocaleDateString(
    lang === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'short', day: 'numeric' },
  );

  return (
    <TooltipProvider>
      <div className="sh-flex sh-flex-col sh-gap-4">
        {/* ===== CONTROL PANEL ===== */}
        <div className="sh-rounded-xl sh-border sh-bg-card sh-overflow-hidden">
          {/* Header Row */}
          <div className="sh-flex sh-flex-col sm:sh-flex-row sh-items-start sm:sh-items-center sh-justify-between sh-gap-2 sh-px-4 sh-py-4 sh-border-b sh-bg-muted/30">
            <div className="sh-flex sh-items-center sh-gap-3">
              <h1 className="sh-text-lg sh-font-semibold sh-tracking-tight">
                {t.title}
              </h1>
              <div className="sh-flex sh-items-center sh-gap-1.5 sh-text-xs sh-text-muted-foreground">
                <span className="sh-font-mono sh-font-bold sh-text-foreground">
                  {summary.total_apis.toLocaleString()}
                </span>
                <span>{t.totalApis}</span>
              </div>
            </div>
            <div className="sh-flex sh-items-center sh-gap-3 sh-text-xs sh-text-muted-foreground">
              <div className="sh-flex sh-items-center sh-gap-1.5">
                <ClockIcon className="sh-w-3 sh-h-3" />
                <span>
                  {t.generatedAt} {generatedDate}
                </span>
              </div>
              <a
                href={withBase(
                  lang === 'zh' ? '/zh/api/status/help' : '/api/status/help',
                )}
                className="sh-flex sh-items-center sh-gap-1 sh-px-2 sh-py-1 sh-rounded-md sh-text-muted-foreground hover:sh-text-foreground hover:sh-bg-muted/50 sh-transition-colors"
              >
                <HelpCircleIcon className="sh-w-3.5 sh-h-3.5" />
                <span>{t.help}</span>
              </a>
            </div>
          </div>

          {/* Filters Row */}
          <div className="sh-p-4 sh-space-y-3">
            {/* Platform Selector - flows inline on desktop, stacks on mobile */}
            <div className="sh-flex sh-flex-wrap sh-items-center sh-gap-1.5">
              {/* Native Platforms */}
              {NATIVE_PLATFORMS.map((platform) => {
                const ps = summary.by_platform[platform];
                if (!ps) return null;
                const colors =
                  platformColors[platform] || platformColors.android;
                const isSelected = selectedPlatform === platform;
                return (
                  <button
                    key={platform}
                    onClick={() => {
                      setSelectedPlatform(platform);
                      setExpandedCategory(null);
                    }}
                    className={cn(
                      'sh-flex sh-items-center sh-gap-1.5 sh-px-2.5 sh-py-1.5 sh-rounded-md sh-text-xs sh-font-medium sh-transition-all',
                      'sh-border-2',
                      isSelected
                        ? `${colors.bg} ${colors.border}`
                        : 'sh-bg-card sh-border-transparent hover:sh-border-muted-foreground/30',
                    )}
                  >
                    <PlatformIcon
                      platform={platform}
                      className={cn('sh-w-3.5 sh-h-3.5', colors.text)}
                    />
                    <span>{PLATFORM_DISPLAY_NAMES[platform]}</span>
                    <span className={cn('sh-font-mono', colors.text)}>
                      {ps.coverage_percent}%
                    </span>
                  </button>
                );
              })}

              {/* Separator on desktop */}
              <div className="sh-hidden sm:sh-block sh-w-px sh-h-5 sh-bg-border sh-mx-1" />

              {/* Clay Toggle */}
              <button
                onClick={() => setShowClay(!showClay)}
                className={cn(
                  'sh-inline-flex sh-items-center sh-gap-1.5 sh-px-2.5 sh-py-1.5 sh-rounded-md sh-text-xs sh-font-medium sh-transition-all sh-border-2',
                  showClay
                    ? 'sh-bg-primary/10 sh-border-primary sh-text-primary'
                    : 'sh-bg-card sh-border-transparent sh-text-muted-foreground hover:sh-border-muted-foreground/30',
                )}
              >
                <svg
                  className={cn(
                    'sh-w-3.5 sh-h-3.5 sh-transition-colors',
                    showClay ? 'sh-text-primary' : 'sh-text-muted-foreground',
                  )}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z" />
                </svg>
                <span>Clay</span>
                {showClay && (
                  <svg
                    className="sh-w-3 sh-h-3"
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
                    platformColors[platform] || platformColors.android;
                  const isSelected = selectedPlatform === platform;
                  return (
                    <button
                      key={platform}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setExpandedCategory(null);
                      }}
                      className={cn(
                        'sh-flex sh-items-center sh-gap-1.5 sh-px-2.5 sh-py-1.5 sh-rounded-md sh-text-xs sh-font-medium sh-transition-all',
                        'sh-border-2',
                        isSelected
                          ? `${colors.bg} ${colors.border}`
                          : 'sh-bg-card sh-border-transparent hover:sh-border-muted-foreground/30',
                      )}
                    >
                      <PlatformIcon
                        platform={platform}
                        className={cn('sh-w-3.5 sh-h-3.5', colors.text)}
                      />
                      <span>{PLATFORM_DISPLAY_NAMES[platform]}</span>
                      <span className={cn('sh-font-mono', colors.text)}>
                        {ps.coverage_percent}%
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Search and Filters - search on own row on mobile, all in one row on desktop */}
            <div className="sh-flex sh-flex-col sm:sh-flex-row sh-gap-2">
              <div className="sh-relative sh-flex-1 sh-min-w-0">
                <SearchIcon className="sh-absolute sh-left-2.5 sh-top-1/2 sh-transform -sh-translate-y-1/2 sh-w-3.5 sh-h-3.5 sh-text-muted-foreground" />
                <Input
                  className="sh-pl-8 sh-h-8 sh-text-sm sh-font-mono"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                />
              </div>
              <div className="sh-flex sh-items-center sh-gap-2 sh-w-full sm:sh-w-auto">
                <div className="sh-flex-1 sm:sh-flex-none sm:sh-w-[130px]">
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger className="sh-h-8 sh-text-xs">
                      <SelectValue placeholder={t.category} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c} className="sh-text-xs">
                          {c === 'all' ? t.all : CATEGORY_DISPLAY_NAMES[c] || c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sh-flex-1 sm:sh-flex-none sm:sh-w-[110px]">
                  <Select
                    value={stateFilter}
                    onValueChange={(v) => setStateFilter(v as any)}
                  >
                    <SelectTrigger className="sh-h-8 sh-text-xs">
                      <SelectValue placeholder={t.state} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="sh-text-xs">
                        {t.all}
                      </SelectItem>
                      <SelectItem value="supported" className="sh-text-xs">
                        {t.supported}
                      </SelectItem>
                      <SelectItem value="unsupported" className="sh-text-xs">
                        {t.unsupported}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* API List - Filtered Results */}
            <div className="sh-border-t sh-pt-3 sh-mt-1">
              <div className="sh-flex sh-items-center sh-justify-between sh-mb-2">
                <span className="sh-text-xs sh-font-medium sh-text-muted-foreground">
                  {t.apiList}
                </span>
                <div className="sh-flex sh-items-center sh-gap-2">
                  <span className="sh-text-[10px] sh-text-muted-foreground">
                    {t.showing} {shownFeatures.length} {t.of}{' '}
                    {filteredFeatures.length} {t.matches}
                  </span>
                  {hasMoreResults && (
                    <button
                      onClick={() => setShowAllResults(!showAllResults)}
                      className="sh-text-[10px] sh-text-primary hover:sh-underline sh-font-medium"
                    >
                      {showAllResults ? t.showLess : t.showAll}
                    </button>
                  )}
                </div>
              </div>
              {shownFeatures.length === 0 ? (
                <div className="sh-text-center sh-py-4 sh-text-xs sh-text-muted-foreground sh-bg-muted/20 sh-rounded-md">
                  {t.noResults}
                </div>
              ) : (
                <div
                  className={cn(
                    'sh-grid sh-grid-cols-1 sm:sh-grid-cols-2 lg:sh-grid-cols-3 xl:sh-grid-cols-4 2xl:sh-grid-cols-5 sh-gap-1 sh-overflow-y-auto sh-pr-1',
                    showAllResults ? 'sh-max-h-[600px]' : 'sh-max-h-[300px]',
                  )}
                >
                  {shownFeatures.map((f) => (
                    <APIItem
                      key={f.id}
                      query={f.query}
                      name={f.name}
                      category={f.category}
                      selectedPlatform={selectedPlatform}
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
        <div className="sh-grid sh-grid-cols-1 md:sh-grid-cols-2 sh-gap-4">
          {/* Platform Stats Card */}
          <Card className="sh-overflow-hidden">
            <CardHeader className="sh-py-2 sh-px-4">
              <CardTitle className="sh-text-sm sh-font-medium sh-flex sh-items-center sh-gap-2">
                <PlatformIcon
                  platform={selectedPlatform}
                  className={cn('sh-w-4 sh-h-4', selectedColors.text)}
                />
                {PLATFORM_DISPLAY_NAMES[selectedPlatform]} Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="sh-pt-0 sh-px-4 sh-pb-3">
              <div className="sh-flex sh-items-end sh-justify-between sh-mb-2">
                <div
                  className={cn(
                    'sh-text-3xl sh-font-bold sh-font-mono',
                    selectedColors.text,
                  )}
                >
                  {platformStats?.coverage_percent}%
                </div>
                <div className="sh-text-right sh-text-xs sh-text-muted-foreground">
                  <div className="sh-font-mono">
                    {platformStats?.supported_count.toLocaleString()} /{' '}
                    {summary.total_apis.toLocaleString()}
                  </div>
                </div>
              </div>
              <Progress
                value={platformStats?.coverage_percent || 0}
                className="sh-h-1.5"
                indicatorClassName={selectedColors.progress}
              />
            </CardContent>
          </Card>

          {/* Trend Chart Card */}
          {timeline && timeline.length >= 2 && (
            <Card>
              <CardHeader className="sh-py-2 sh-px-4">
                <CardTitle className="sh-text-sm sh-font-medium sh-flex sh-items-center sh-gap-2">
                  <TrendingUpIcon className="sh-w-4 sh-h-4 sh-text-primary" />
                  {t.parityOverTime}
                </CardTitle>
              </CardHeader>
              <CardContent className="sh-pt-0 sh-px-2 sh-pb-2">
                <ParityChart
                  timeline={timeline}
                  selectedPlatform={selectedPlatform}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===== CATEGORY BREAKDOWN ===== */}
        <Card>
          <CardHeader className="sh-py-2 sh-px-4">
            <CardTitle className="sh-text-sm sh-font-medium sh-flex sh-items-center sh-justify-between">
              <div className="sh-flex sh-items-center sh-gap-2">
                <LayersIcon className="sh-w-4 sh-h-4 sh-text-primary" />
                {t.categoryBreakdown}
              </div>
              <div className="sh-flex sh-items-center sh-gap-1 sh-bg-muted/50 sh-rounded-md sh-p-0.5">
                <button
                  onClick={() => setHighlightMode('green')}
                  className={cn(
                    'sh-px-2 sh-py-1 sh-rounded sh-text-xs sh-font-medium sh-transition-all',
                    highlightMode === 'green'
                      ? 'sh-bg-emerald-500/20 sh-text-emerald-700 dark:sh-text-emerald-300'
                      : 'sh-text-muted-foreground hover:sh-text-foreground',
                  )}
                >
                  {t.highlightGood}
                </button>
                <button
                  onClick={() => setHighlightMode('red')}
                  className={cn(
                    'sh-px-2 sh-py-1 sh-rounded sh-text-xs sh-font-medium sh-transition-all',
                    highlightMode === 'red'
                      ? 'sh-bg-red-500/20 sh-text-red-700 dark:sh-text-red-300'
                      : 'sh-text-muted-foreground hover:sh-text-foreground',
                  )}
                >
                  {t.highlightBad}
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="sh-pt-0 sh-px-0 sh-pb-0">
            <CategoryTable
              categories={categories}
              showClay={showClay}
              selectedPlatform={selectedPlatform}
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
            className="sh-py-2 sh-px-4 sh-cursor-pointer hover:sh-bg-muted/30 sh-transition-colors"
            onClick={() => setShowRecentApis(!showRecentApis)}
          >
            <CardTitle className="sh-text-sm sh-font-medium sh-flex sh-items-center sh-justify-between">
              <div className="sh-flex sh-items-center sh-gap-2">
                <SparklesIcon className="sh-w-4 sh-h-4 sh-text-primary" />
                {t.recentApisTitle}
                <span className="sh-text-xs sh-text-muted-foreground sh-font-normal">
                  (
                  {recentApisByVersion.reduce(
                    (sum, g) => sum + g.apis.length,
                    0,
                  )}{' '}
                  for {PLATFORM_DISPLAY_NAMES[selectedPlatform]})
                </span>
              </div>
              <svg
                className={cn(
                  'sh-w-4 sh-h-4 sh-transition-transform',
                  showRecentApis && 'sh-rotate-180',
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
            <CardContent className="sh-pt-0 sh-px-4 sh-pb-4">
              <div className="sh-space-y-4 sh-max-h-[400px] sh-overflow-y-auto sh-pr-1">
                {recentApisByVersion.length === 0 ? (
                  <div className="sh-text-center sh-py-4 sh-text-sm sh-text-muted-foreground">
                    No recent APIs for{' '}
                    {PLATFORM_DISPLAY_NAMES[selectedPlatform]}
                  </div>
                ) : (
                  recentApisByVersion.map(({ version, apis }) => (
                    <div key={version}>
                      <div className="sh-flex sh-items-center sh-gap-2 sh-mb-2">
                        <span className="sh-text-xs sh-font-semibold sh-px-2 sh-py-0.5 sh-rounded sh-bg-primary/10 sh-text-primary sh-font-mono">
                          v{version}
                        </span>
                        <span className="sh-text-[10px] sh-text-muted-foreground">
                          {apis.length} APIs
                        </span>
                        <div className="sh-flex-1 sh-h-px sh-bg-border" />
                      </div>
                      <div className="sh-grid sh-grid-cols-1 sm:sh-grid-cols-2 lg:sh-grid-cols-3 sh-gap-1">
                        {apis.map((f) => (
                          <APIItem
                            key={f.id}
                            query={f.query}
                            name={f.name}
                            category={f.category}
                            selectedPlatform={selectedPlatform}
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
