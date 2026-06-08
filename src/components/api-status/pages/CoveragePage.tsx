import { useLang } from '@rspress/core/runtime';
import React, { useState } from 'react';
import { PLATFORM_CONFIG } from '../constants';
import type { APIStats, DisplayPlatformName, TimelinePoint } from '../types';

const i18n = {
  en: {
    exclusive: 'EXCL',
    parityLegend: 'Coverage by platform across the Lynx Platform API surface.',
    trendLegend: 'Coverage progression across released versions.',
  },
  zh: {
    exclusive: '独占',
    parityLegend: 'Lynx Platform API 表面下各平台的覆盖率。',
    trendLegend: '各发布版本中的覆盖率演进。',
  },
};

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

// ─── Trend chart ─────────────────────────────────────────────────────────
//
// Fills its plate full-width via a wide viewBox (1200×320) +
// preserveAspectRatio="none", which stretches the SVG horizontally to the
// plate width regardless of aspect ratio. Stroke widths stay constant via
// vectorEffect="non-scaling-stroke" so lines don't get distorted by the
// stretch. Each platform line gets a per-index Y offset of ±3.5 viewBox
// units so identical values don't render as a single line — the user
// always sees every selected platform.

interface ParityChartProps {
  timeline: TimelinePoint[];
  selectedPlatforms: DisplayPlatformName[];
}

const ParityChart: React.FC<ParityChartProps> = ({
  timeline,
  selectedPlatforms,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeline || timeline.length < 2) return null;

  const w = 1200;
  const h = 320;
  const padX = 56;
  // Extra room on the right for end-of-line platform labels (up to ~110
  // viewBox units of text — "HarmonyOS" is the worst case).
  const padRight = 130;
  const padTop = 28;
  const padBottom = 36;

  // Y offset per platform separates overlapping lines so each selected
  // platform is always visible. Centered around 0 so the visual mean
  // tracks the data, not the rendering order.
  const platformPoints = selectedPlatforms.map((platform, idx) => {
    const offset = (idx - (selectedPlatforms.length - 1) / 2) * 3.5;
    return {
      platform,
      points: timeline.map((t, i) => ({
        x:
          padX + (i * (w - padX - padRight)) / Math.max(1, timeline.length - 1),
        y:
          padTop +
          (1 - Math.min(1, (t.platforms[platform]?.coverage ?? 0) / 100)) *
            (h - padTop - padBottom) +
          offset,
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
        className="w-full"
        style={{ display: 'block', height: 'min(40vh, 360px)' }}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Horizontal grid */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padTop + (1 - v / 100) * (h - padTop - padBottom);
          return (
            <g key={v}>
              <line
                x1={padX}
                y1={y}
                x2={w - padRight}
                y2={y}
                stroke="currentColor"
                strokeOpacity={v === 100 || v === 0 ? 0.18 : 0.08}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={v === 50 ? '0' : v % 50 === 0 ? '0' : '3 4'}
              />
              <text
                x={padX - 10}
                y={y + 4}
                fontSize="12"
                fill="currentColor"
                fillOpacity="0.4"
                textAnchor="end"
                style={{ vectorEffect: 'non-scaling-stroke' }}
              >
                {v}%
              </text>
            </g>
          );
        })}

        {/* Per-platform line + interactive points */}
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
                strokeWidth="2.5"
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
                    r="18"
                    fill="transparent"
                    className="cursor-pointer"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 6 : 3.5}
                    fill={colors.line}
                    className="transition-all"
                    style={{ vectorEffect: 'non-scaling-stroke' }}
                  />
                </g>
              ))}
              {/* End-of-line label — quiet platform tag right of the last
                  point so each line is identifiable without a separate
                  legend. */}
              <text
                x={points[points.length - 1].x + 10}
                y={points[points.length - 1].y + 4}
                fontSize="13"
                fontWeight="600"
                fill={colors.line}
                style={{ vectorEffect: 'non-scaling-stroke' }}
              >
                {PLATFORM_CONFIG[platform]?.label || platform}
              </text>
            </React.Fragment>
          );
        })}

        {/* X axis labels */}
        <text
          x={padX}
          y={h - 10}
          fontSize="12"
          fill="currentColor"
          fillOpacity="0.55"
        >
          v{timeline[0].version}
        </text>
        <text
          x={w - padRight}
          y={h - 10}
          fontSize="12"
          fill="currentColor"
          fillOpacity="0.55"
          textAnchor="end"
        >
          v{timeline[timeline.length - 1].version}
        </text>
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
  const { summary, timeline } = stats;

  return (
    <div className="flex flex-col gap-4">
      {/* Parity strip — one row per platform, full-width bar dominant.
          Replaces the previous stat-card grid (which was the hero-metric
          trope). Reads as a ranked list, not a card array. */}
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
                    {/* Quiet 25/50/75% tick marks for quantitative reference */}
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

      {/* Trend chart — full-bleed inside the plate. End-of-line labels
          identify each platform without needing a separate legend strip. */}
      {timeline && timeline.length >= 2 && (
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
              {t.trendLegend}
            </p>
          </div>
          <div className="aps-plate__body" style={{ padding: '8px 8px 4px' }}>
            <ParityChart
              timeline={timeline}
              selectedPlatforms={selectedPlatforms}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CoveragePage;
