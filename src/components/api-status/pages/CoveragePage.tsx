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
  selectedPlatform: PlatformName;
}

const ParityChart: React.FC<ParityChartProps> = ({
  timeline,
  selectedPlatform,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeline || timeline.length < 2) return null;

  const w = 500;
  const h = 180;
  const padX = 40;
  const padY = 24;

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
  const colors =
    PLATFORM_CONFIG[selectedPlatform]?.colors ||
    PLATFORM_CONFIG.web_lynx.colors;
  const lastPoint = points[points.length - 1];
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

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

        {/* Area fill */}
        <polygon
          points={`${padX},${h - padY} ${polyline} ${lastPoint.x},${h - padY}`}
          fill={colors.line}
          fillOpacity="0.15"
        />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={colors.line}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
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
          {lastPoint.version}
        </text>

        {/* Current label */}
        <text
          x={lastPoint.x + 6}
          y={lastPoint.y + 4}
          fontSize="12"
          fill={colors.line}
          fontWeight="600"
        >
          {lastPoint.coverage}%
        </text>
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute bg-popover border rounded-md px-2.5 py-1.5 text-xs shadow-lg pointer-events-none z-10"
          style={{
            left: hovered.x,
            top: hovered.y - 36,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-mono font-semibold">{hovered.coverage}%</span>
          <span className="text-muted-foreground ml-1.5">
            v{hovered.version}
          </span>
        </div>
      )}
    </div>
  );
};

interface CoveragePageProps {
  stats: APIStats;
  selectedPlatform: PlatformName;
}

export const CoveragePage: React.FC<CoveragePageProps> = ({
  stats,
  selectedPlatform,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const { summary, timeline } = stats;
  const platformStats = summary.by_platform[selectedPlatform];
  const colors =
    PLATFORM_CONFIG[selectedPlatform]?.colors ||
    PLATFORM_CONFIG.web_lynx.colors;

  return (
    <div className="space-y-6">
      {/* Platform Coverage Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <PlatformIcon
              platform={selectedPlatform}
              className={cn('w-5 h-5', colors.text)}
            />
            {PLATFORM_CONFIG[selectedPlatform]?.label || selectedPlatform}{' '}
            {t.coverage}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mb-3">
            <div className={cn('text-5xl font-bold font-mono', colors.text)}>
              {platformStats?.coverage_percent}%
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="font-mono text-lg">
                {platformStats?.supported_count.toLocaleString()} /{' '}
                {summary.total_apis.toLocaleString()}
              </div>
              <div>
                {t.supported} / {t.total}
              </div>
            </div>
          </div>
          <Progress
            value={platformStats?.coverage_percent || 0}
            className="h-3"
            indicatorClassName={colors.progress}
          />
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {timeline && timeline.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
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
          <CardContent>
            <ParityChart
              timeline={timeline}
              selectedPlatform={selectedPlatform}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CoveragePage;
