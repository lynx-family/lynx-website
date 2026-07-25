import { cn } from '@/lib/utils';
import { useLang } from '@rspress/core/runtime';
import React, { useMemo, useState } from 'react';
import { PLATFORM_CONFIG } from '../constants';
import {
  CATEGORY_DISPLAY_NAMES,
  type APIStats,
  type DisplayPlatformName,
  type FeatureInfo,
  type TimelinePoint,
} from '../types';

const i18n = {
  en: {
    exclusive: 'EXCL',
    parityLegend: 'Coverage by platform across the Lynx Platform API surface.',
    trendLegend: 'Coverage progression across released versions.',
    categoryFilter: 'Category',
    allCategories: 'All Platform API',
    yScale: 'Y scale',
    yFull: '0–100%',
    yFocus: 'Focus range',
    byCategory: 'Trend by category',
    byCategoryLegend:
      'Same window, split by category — easier to spot where coverage moved.',
    deltaFrom: 'Δ from',
    noData: 'Not enough timeline data for this filter.',
    features: 'features',
  },
  zh: {
    exclusive: '独占',
    parityLegend: 'Lynx Platform API 表面下各平台的覆盖率。',
    trendLegend: '各发布版本中的覆盖率演进。',
    categoryFilter: '分类',
    allCategories: '全部 Platform API',
    yScale: 'Y 轴',
    yFull: '0–100%',
    yFocus: '聚焦区间',
    byCategory: '按分类趋势',
    byCategoryLegend: '同一时间窗口按分类拆分，更容易看出覆盖率变化来源。',
    deltaFrom: '相对',
    noData: '当前筛选条件下没有足够的时间线数据。',
    features: '个特性',
  },
};

/** Platform-API categories used for coverage (mirrors generate-stats.ts). */
const PLATFORM_API_CATEGORIES = new Set([
  'elements',
  'css/properties',
  'css/at-rule',
  'css/data-type',
  'lynx-api/global',
  'lynx-api/event',
  'lynx-api/fetch',
  'lynx-api/lynx',
  'lynx-api/selector-query',
  'lynx-api/nodes-ref',
  'lynx-api/intersection-observer',
  'lynx-api/main-thread',
  'lynx-api/performance-api',
]);

/** Filter chips shown above the main trend chart. */
const CATEGORY_FILTERS: Array<{ id: string; label: string; match: string[] }> =
  [
    { id: 'all', label: 'All', match: [] },
    { id: 'elements', label: 'Elements', match: ['elements'] },
    {
      id: 'css/properties',
      label: 'CSS Properties',
      match: ['css/properties'],
    },
    { id: 'css/at-rule', label: 'CSS At-Rules', match: ['css/at-rule'] },
    {
      id: 'css/data-type',
      label: 'CSS Data Types',
      match: ['css/data-type'],
    },
    {
      id: 'lynx-api',
      label: 'Lynx API',
      match: [
        'lynx-api/global',
        'lynx-api/event',
        'lynx-api/fetch',
        'lynx-api/lynx',
        'lynx-api/selector-query',
        'lynx-api/nodes-ref',
        'lynx-api/intersection-observer',
        'lynx-api/main-thread',
        'lynx-api/performance-api',
      ],
    },
  ];

/** Categories rendered as small-multiple charts. */
const CATEGORY_CHARTS = CATEGORY_FILTERS.filter((c) => c.id !== 'all');

const PlatformIcon: React.FC<{
  platform: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ platform, className, style }) => {
  const Icon = PLATFORM_CONFIG[platform]?.icon;
  return Icon ? <Icon className={className} style={style} /> : null;
};

const platformVars = (platform: string): React.CSSProperties => {
  const line =
    PLATFORM_CONFIG[platform]?.colors.line ||
    PLATFORM_CONFIG.android.colors.line;
  return { ['--platform' as any]: line };
};

function parseVersion(v: string): number {
  const parts = v.split('.').map(Number);
  return parts[0] * 1000 + (parts[1] || 0);
}

function isSupported(version: string | boolean | null | undefined): boolean {
  return version !== false && version !== null && version !== undefined;
}

function isVersionAtOrBefore(
  versionAdded: string | boolean | null | undefined,
  targetVersion: string,
): boolean {
  if (versionAdded === true) return true;
  if (
    versionAdded === false ||
    versionAdded === null ||
    versionAdded === undefined
  ) {
    return false;
  }
  if (typeof versionAdded !== 'string') return false;
  return parseVersion(versionAdded) <= parseVersion(targetVersion);
}

function matchesCategoryFilter(category: string, filterId: string): boolean {
  if (filterId === 'all') return PLATFORM_API_CATEGORIES.has(category);
  const filter = CATEGORY_FILTERS.find((f) => f.id === filterId);
  if (!filter) return category === filterId;
  return filter.match.includes(category);
}

/**
 * Recompute coverage timeline for a category subset, matching the
 * generator's Platform-API shared-feature (≥2 platforms) rule.
 */
function buildTimeline(
  features: FeatureInfo[] | undefined,
  versions: Array<{ version: string; release_date?: string }>,
  categoryFilter: string,
  platforms: DisplayPlatformName[],
): { timeline: TimelinePoint[]; featureCount: number } {
  if (!features || versions.length === 0) {
    return { timeline: [], featureCount: 0 };
  }

  const relevant = features.filter((f) => {
    if (!matchesCategoryFilter(f.category, categoryFilter)) return false;
    const supportCount = Object.entries(f.support).filter(([key, s]) => {
      // Count real platforms only (not aggregate clay) for the ≥2 rule.
      if (key === 'clay') return false;
      return s && isSupported(s.version_added);
    }).length;
    return supportCount >= 2;
  });

  const timeline: TimelinePoint[] = versions.map((v) => {
    const platformStats: TimelinePoint['platforms'] = {};
    for (const platform of platforms) {
      let supported = 0;
      for (const feature of relevant) {
        const support = feature.support[platform];
        if (support && isVersionAtOrBefore(support.version_added, v.version)) {
          supported++;
        }
      }
      platformStats[platform] = {
        supported,
        coverage:
          relevant.length > 0
            ? Math.round((supported / relevant.length) * 100)
            : 0,
      };
    }
    return {
      version: v.version,
      release_date: v.release_date,
      platforms: platformStats,
    };
  });

  return { timeline, featureCount: relevant.length };
}

// ─── Trend chart ─────────────────────────────────────────────────────────

interface ParityChartProps {
  timeline: TimelinePoint[];
  selectedPlatforms: DisplayPlatformName[];
  /** When true, Y axis zooms to the data range so small deltas are visible. */
  focusScale: boolean;
  /** Compact mode for small-multiple tiles. */
  compact?: boolean;
}

const ParityChart: React.FC<ParityChartProps> = ({
  timeline,
  selectedPlatforms,
  focusScale,
  compact = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeline || timeline.length < 2) return null;

  const w = compact ? 640 : 1200;
  const h = compact ? 220 : 320;
  const padX = compact ? 40 : 56;
  const padRight = compact ? 88 : 130;
  const padTop = compact ? 18 : 28;
  const padBottom = compact ? 40 : 44;

  // Collect coverage values to decide Y domain.
  const values: number[] = [];
  for (const t of timeline) {
    for (const platform of selectedPlatforms) {
      const c = t.platforms[platform]?.coverage;
      if (typeof c === 'number') values.push(c);
    }
  }
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 100;

  let yMin = 0;
  let yMax = 100;
  if (focusScale && values.length > 0) {
    const span = Math.max(8, dataMax - dataMin);
    const pad = Math.max(3, span * 0.2);
    yMin = Math.max(0, Math.floor((dataMin - pad) / 2) * 2);
    yMax = Math.min(100, Math.ceil((dataMax + pad) / 2) * 2);
    if (yMax - yMin < 10) {
      yMax = Math.min(100, yMin + 10);
    }
  }

  const yTicks = (() => {
    const ticks: number[] = [];
    const span = yMax - yMin;
    const step = span <= 12 ? 2 : span <= 25 ? 5 : span <= 50 ? 10 : 25;
    for (let v = yMin; v <= yMax + 0.01; v += step) {
      ticks.push(Math.round(v));
    }
    if (ticks[ticks.length - 1] !== yMax) ticks.push(yMax);
    return ticks;
  })();

  const toY = (coverage: number, offset: number) =>
    padTop +
    (1 - (coverage - yMin) / Math.max(1, yMax - yMin)) *
      (h - padTop - padBottom) +
    offset;

  const platformPoints = selectedPlatforms.map((platform, idx) => {
    const offset =
      (idx - (selectedPlatforms.length - 1) / 2) * (compact ? 2 : 3);
    return {
      platform,
      points: timeline.map((t, i) => ({
        x:
          padX + (i * (w - padX - padRight)) / Math.max(1, timeline.length - 1),
        y: toY(t.platforms[platform]?.coverage ?? 0, offset),
        version: t.version,
        coverage: t.platforms[platform]?.coverage ?? 0,
        supported: t.platforms[platform]?.supported ?? 0,
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

  // Label every version when few; otherwise first/last + every other.
  const labelIndexes = (() => {
    if (timeline.length <= 8) {
      return timeline.map((_, i) => i);
    }
    const idxs = new Set<number>([0, timeline.length - 1]);
    for (let i = 0; i < timeline.length; i += 2) idxs.add(i);
    return [...idxs].sort((a, b) => a - b);
  })();

  return (
    <div className="relative">
      <svg
        className="w-full"
        style={{
          display: 'block',
          height: compact ? 'min(28vh, 220px)' : 'min(42vh, 380px)',
        }}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {yTicks.map((v) => {
          const y = toY(v, 0);
          return (
            <g key={v}>
              <line
                x1={padX}
                y1={y}
                x2={w - padRight}
                y2={y}
                stroke="currentColor"
                strokeOpacity={v === yMin || v === yMax ? 0.18 : 0.08}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={padX - 8}
                y={y + 3.5}
                fontSize={compact ? '10' : '12'}
                fill="currentColor"
                fillOpacity="0.4"
                textAnchor="end"
              >
                {v}%
              </text>
            </g>
          );
        })}

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
                strokeWidth={compact ? '2' : '2.5'}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
                vectorEffect="non-scaling-stroke"
              />
              {points.map((p, i) => (
                <g key={i} onMouseEnter={() => setHoveredIndex(i)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={compact ? 14 : 18}
                    fill="transparent"
                    className="cursor-pointer"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={
                      hoveredIndex === i
                        ? compact
                          ? 5
                          : 6
                        : compact
                          ? 2.5
                          : 3.5
                    }
                    fill={colors.line}
                    className="transition-all"
                  />
                </g>
              ))}
              <text
                x={points[points.length - 1].x + 8}
                y={points[points.length - 1].y + 3.5}
                fontSize={compact ? '11' : '13'}
                fontWeight="600"
                fill={colors.line}
              >
                {PLATFORM_CONFIG[platform]?.label || platform}
              </text>
            </React.Fragment>
          );
        })}

        {labelIndexes.map((i) => {
          const x =
            padX +
            (i * (w - padX - padRight)) / Math.max(1, timeline.length - 1);
          const isEdge = i === 0 || i === timeline.length - 1;
          return (
            <text
              key={i}
              x={x}
              y={h - 12}
              fontSize={compact ? '10' : '11'}
              fill="currentColor"
              fillOpacity={isEdge ? 0.65 : 0.45}
              textAnchor={
                i === 0 ? 'start' : i === timeline.length - 1 ? 'end' : 'middle'
              }
            >
              v{timeline[i].version}
            </text>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="absolute bg-popover border rounded-md px-2.5 py-1.5 text-xs shadow-lg pointer-events-none z-10"
          style={{
            left: `${(hovered[0].point.x / w) * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-mono text-[10px] text-muted-foreground mb-1 border-b pb-1">
            v{hovered[0].point.version}
          </div>
          {hovered.map(({ platform, point }) => {
            const colors =
              PLATFORM_CONFIG[platform]?.colors ||
              PLATFORM_CONFIG.web_lynx.colors;
            return (
              <div key={platform} className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: colors.line }}
                />
                <span>{PLATFORM_CONFIG[platform]?.label || platform}</span>
                <span className="font-mono font-semibold ml-auto">
                  {point.coverage}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────

interface CoveragePageProps {
  stats: APIStats;
  selectedPlatforms: DisplayPlatformName[];
}

export const CoveragePage: React.FC<CoveragePageProps> = ({
  stats,
  selectedPlatforms,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;
  const { summary, timeline: baseTimeline, features } = stats;

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [focusScale, setFocusScale] = useState(true);

  const versions = useMemo(
    () =>
      (baseTimeline ?? []).map((p) => ({
        version: p.version,
        release_date: p.release_date,
      })),
    [baseTimeline],
  );

  const { timeline, featureCount } = useMemo(() => {
    if (categoryFilter === 'all' && baseTimeline && baseTimeline.length >= 2) {
      // Prefer precomputed overall timeline (includes clay aggregate).
      return {
        timeline: baseTimeline,
        featureCount: summary.platform_api_total,
      };
    }
    return buildTimeline(features, versions, categoryFilter, selectedPlatforms);
  }, [
    categoryFilter,
    baseTimeline,
    features,
    versions,
    selectedPlatforms,
    summary.platform_api_total,
  ]);

  const categoryTimelines = useMemo(() => {
    return CATEGORY_CHARTS.map((cat) => {
      const built = buildTimeline(
        features,
        versions,
        cat.id,
        selectedPlatforms,
      );
      const first = built.timeline[0];
      const last = built.timeline[built.timeline.length - 1];
      const deltas = selectedPlatforms.map((platform) => {
        const a = first?.platforms[platform]?.coverage ?? 0;
        const b = last?.platforms[platform]?.coverage ?? 0;
        return { platform, delta: b - a, from: a, to: b };
      });
      return {
        ...cat,
        ...built,
        deltas,
        label:
          cat.id === 'lynx-api'
            ? 'Lynx API'
            : CATEGORY_DISPLAY_NAMES[cat.id] || cat.label,
      };
    }).filter((c) => c.timeline.length >= 2 && c.featureCount > 0);
  }, [features, versions, selectedPlatforms]);

  const filterLabel =
    categoryFilter === 'all'
      ? t.allCategories
      : CATEGORY_FILTERS.find((f) => f.id === categoryFilter)?.label ||
        categoryFilter;

  return (
    <div className="flex flex-col gap-4">
      {/* Parity strip */}
      <div className="aps-plate">
        <div className="aps-plate__head">
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--rp-c-text-3, #8e8e98)',
              letterSpacing: 0,
              lineHeight: 1.4,
            }}
          >
            {t.parityLegend}
          </p>
        </div>
        <div className="aps-plate__body" style={{ padding: '4px 16px' }}>
          <div className="aps-parity-list">
            {selectedPlatforms.map((platform) => {
              const ps = summary.by_platform[platform];
              if (!ps) return null;
              return (
                <div
                  key={platform}
                  className="aps-parity-row"
                  style={platformVars(platform)}
                >
                  <div className="aps-parity-row__id">
                    <PlatformIcon
                      platform={platform}
                      className="aps-parity-row__icon"
                    />
                    <span className="aps-parity-row__label">
                      {PLATFORM_CONFIG[platform]?.label || platform}
                    </span>
                  </div>
                  <div className="aps-parity-row__bar">
                    <span
                      className="aps-parity-row__bar-tick"
                      style={{ left: '25%' }}
                    />
                    <span
                      className="aps-parity-row__bar-tick"
                      style={{ left: '50%' }}
                    />
                    <span
                      className="aps-parity-row__bar-tick"
                      style={{ left: '75%' }}
                    />
                    <span
                      className="aps-parity-row__bar-fill"
                      style={{
                        ['--pct' as any]: `${ps.coverage_percent}%`,
                      }}
                    />
                  </div>
                  <div className="aps-parity-row__numbers">
                    <span className="aps-parity-row__pct">
                      {ps.coverage_percent}%
                    </span>
                    <span className="aps-parity-row__counts">
                      {ps.supported_count.toLocaleString()}
                      <span style={{ opacity: 0.55 }}>
                        {' / '}
                        {summary.platform_api_total.toLocaleString()}
                      </span>
                      {(ps.exclusive_count ?? 0) > 0 && (
                        <span className="aps-parity-row__exclusive">
                          +{ps.exclusive_count} {t.exclusive}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main trend chart with category + Y-scale controls */}
      {versions.length >= 2 && (
        <div className="aps-plate">
          <div className="aps-plate__head" style={{ flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--rp-c-text-3, #8e8e98)',
                  letterSpacing: 0,
                  lineHeight: 1.4,
                }}
              >
                {t.trendLegend}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: 'var(--rp-c-text-2, #6a6a73)',
                  fontFamily: 'var(--rp-font-mono, ui-monospace, monospace)',
                }}
              >
                {filterLabel}
                {' · '}v{versions[0].version} → v
                {versions[versions.length - 1].version}
                {featureCount > 0 && (
                  <>
                    {' · '}
                    {featureCount.toLocaleString()} {t.features}
                  </>
                )}
              </p>
            </div>
            <div className="aps-trend-controls">
              <div className="aps-trend-seg" role="group" aria-label={t.yScale}>
                <button
                  type="button"
                  className={cn(
                    'aps-trend-seg__btn',
                    focusScale && 'aps-trend-seg__btn--active',
                  )}
                  onClick={() => setFocusScale(true)}
                >
                  {t.yFocus}
                </button>
                <button
                  type="button"
                  className={cn(
                    'aps-trend-seg__btn',
                    !focusScale && 'aps-trend-seg__btn--active',
                  )}
                  onClick={() => setFocusScale(false)}
                >
                  {t.yFull}
                </button>
              </div>
            </div>
          </div>

          <div
            className="aps-trend-filters"
            role="tablist"
            aria-label={t.categoryFilter}
          >
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={categoryFilter === f.id}
                className={cn(
                  'aps-trend-chip',
                  categoryFilter === f.id && 'aps-trend-chip--active',
                )}
                onClick={() => setCategoryFilter(f.id)}
              >
                {f.id === 'all' ? t.allCategories : f.label}
              </button>
            ))}
          </div>

          <div className="aps-plate__body" style={{ padding: '8px 8px 4px' }}>
            {timeline.length >= 2 ? (
              <ParityChart
                timeline={timeline}
                selectedPlatforms={selectedPlatforms}
                focusScale={focusScale}
              />
            ) : (
              <p
                style={{
                  margin: '24px 12px',
                  fontSize: 13,
                  color: 'var(--rp-c-text-3, #8e8e98)',
                }}
              >
                {t.noData}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Per-category small multiples */}
      {categoryTimelines.length > 0 && (
        <div className="aps-plate">
          <div className="aps-plate__head">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p className="aps-plate__title" style={{ fontSize: 13 }}>
                {t.byCategory}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--rp-c-text-3, #8e8e98)',
                  lineHeight: 1.4,
                }}
              >
                {t.byCategoryLegend}
              </p>
            </div>
          </div>
          <div className="aps-trend-grid">
            {categoryTimelines.map((cat) => (
              <div key={cat.id} className="aps-trend-tile">
                <div className="aps-trend-tile__head">
                  <div>
                    <div className="aps-trend-tile__title">{cat.label}</div>
                    <div className="aps-trend-tile__meta">
                      {cat.featureCount.toLocaleString()} {t.features}
                    </div>
                  </div>
                  <div className="aps-trend-tile__deltas">
                    {cat.deltas.map(({ platform, delta }) => {
                      const colors =
                        PLATFORM_CONFIG[platform]?.colors ||
                        PLATFORM_CONFIG.web_lynx.colors;
                      const sign = delta > 0 ? '+' : '';
                      return (
                        <span
                          key={platform}
                          className="aps-trend-tile__delta"
                          style={{ color: colors.line }}
                          title={`${PLATFORM_CONFIG[platform]?.label}: ${sign}${delta}pp`}
                        >
                          {sign}
                          {delta}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <ParityChart
                  timeline={cat.timeline}
                  selectedPlatforms={selectedPlatforms}
                  focusScale={focusScale}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoveragePage;
