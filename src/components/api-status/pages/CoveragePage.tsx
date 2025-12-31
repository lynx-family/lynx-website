import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { PLATFORM_CONFIG } from '../constants';
import type { APIStats, TimelinePoint } from '../types';

const i18n = {
  en: {
    coverage: 'Coverage',
    trend: 'Coverage Trend',
    supported: 'Supported',
    total: 'Total APIs',
  },
  zh: {
    coverage: '覆盖率',
    trend: '覆盖率趋势',
    supported: '已支持',
    total: '总 API 数',
  },
};

// Platform icon
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  const Icon = PLATFORM_CONFIG[platform]?.icon;
  return Icon ? <Icon className={className} /> : null;
};

// Trend Chart
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

  const w = 500;
  const h = 180;
  const padX = 40;
  const padY = 24;

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

  const lastPoints = platformPoints.map((p) => ({
    platform: p.platform,
    point: p.points[p.points.length - 1],
  }));

  return (
    <div className="relative">
      <svg
        className="w-full h-[180px]"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Grid */}
        {[0, 25, 50, 75, 100].map((v) => {
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
                x={padX - 6}
                y={y + 3}
                fontSize="10"
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
              {/* Line */}
              <polyline
                points={polyline}
                fill="none"
                stroke={colors.line}
                strokeWidth="2.5"
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
                    r="16"
                    fill="transparent"
                    className="cursor-pointer"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 6 : 4}
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
          y={h - 6}
          fontSize="10"
          fill="currentColor"
          fillOpacity="0.5"
        >
          {timeline[0].version}
        </text>
        <text
          x={w - padX}
          y={h - 6}
          fontSize="10"
          fill="currentColor"
          fillOpacity="0.5"
          textAnchor="end"
        >
          {timeline[timeline.length - 1].version}
        </text>
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute bg-popover border rounded-md px-2.5 py-1.5 text-xs shadow-lg pointer-events-none z-10"
          style={{
            left: hovered[0].point.x,
            top: 0, // Top of chart area
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-mono text-[10px] text-muted-foreground mb-1 border-b pb-1">
            v{hovered[0].point.version}
          </div>
          {hovered.map(({ platform, point }) => (
            <div key={platform} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  PLATFORM_CONFIG[platform]?.colors.bg,
                )}
              />
              <span>{PLATFORM_CONFIG[platform]?.label || platform}</span>
              <span className="font-mono font-semibold ml-auto">
                {point.coverage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface CoveragePageProps {
  stats: APIStats;
  selectedPlatforms: PlatformName[];
}

export const CoveragePage: React.FC<CoveragePageProps> = ({
  stats,
  selectedPlatforms,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const { summary, timeline } = stats;

  return (
    <div className="space-y-6">
      {/* Platform Coverage Cards - Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedPlatforms.map((platform) => {
          const platformStats = summary.by_platform[platform];
          const colors =
            PLATFORM_CONFIG[platform]?.colors ||
            PLATFORM_CONFIG.web_lynx.colors;

          return (
            <Card
              key={platform}
              className={cn('transition-all', colors.bg, colors.border)}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon
                    platform={platform}
                    className={cn('w-4 h-4', colors.text)}
                  />
                  <span className={cn('text-sm font-medium', colors.text)}>
                    {PLATFORM_CONFIG[platform]?.label || platform}
                  </span>
                </div>

                <div>
                  <div
                    className={cn(
                      'text-3xl font-bold font-mono leading-none mb-2',
                      colors.text,
                    )}
                  >
                    {platformStats?.coverage_percent}%
                  </div>
                  <Progress
                    value={platformStats?.coverage_percent || 0}
                    className="h-1.5 bg-black/5 dark:bg-white/10"
                    indicatorClassName={colors.progress}
                  />
                  <div className="mt-1.5 text-[10px] font-mono opacity-70 flex justify-between">
                    <span>
                      {platformStats?.supported_count.toLocaleString()} /{' '}
                      {summary.total_apis.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend Chart */}
      {timeline && timeline.length >= 2 && (
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <svg
                className="w-4 h-4 text-primary"
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
              {t.trend}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-2 pb-2">
            <ParityChart
              timeline={timeline}
              selectedPlatforms={selectedPlatforms}
            />
            {/* Bottom figures - Platform Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {selectedPlatforms.map((platform) => {
                const ps = summary.by_platform[platform];
                const colors =
                  PLATFORM_CONFIG[platform]?.colors ||
                  PLATFORM_CONFIG.web_lynx.colors;
                return (
                  <div key={platform} className="flex items-center gap-1.5">
                    <div
                      className={cn('w-2 h-2 rounded-full', colors.progress)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {PLATFORM_CONFIG[platform]?.label || platform}
                    </span>
                    <span className="text-xs font-mono font-bold">
                      {ps?.coverage_percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CoveragePage;
