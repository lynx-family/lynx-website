import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import type { APIStats, TimelinePoint } from '../types';
import { PLATFORM_DISPLAY_NAMES } from '../types';

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

// Platform colors
const platformColors: Record<
  string,
  { bg: string; text: string; progress: string; line: string }
> = {
  android: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    progress: 'bg-emerald-500',
    line: '#10b981',
  },
  ios: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    progress: 'bg-blue-500',
    line: '#3b82f6',
  },
  harmony: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    progress: 'bg-orange-500',
    line: '#f97316',
  },
  web_lynx: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-700 dark:text-purple-400',
    progress: 'bg-purple-500',
    line: '#a855f7',
  },
  clay_android: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-700 dark:text-teal-400',
    progress: 'bg-teal-500',
    line: '#14b8a6',
  },
  clay_ios: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-700 dark:text-cyan-400',
    progress: 'bg-cyan-500',
    line: '#06b6d4',
  },
  clay_macos: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-400',
    progress: 'bg-indigo-500',
    line: '#6366f1',
  },
  clay_windows: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-400',
    progress: 'bg-sky-500',
    line: '#0ea5e9',
  },
};

// Platform icon
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
  const colors = platformColors[selectedPlatform] || platformColors.web_lynx;
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
  const colors = platformColors[selectedPlatform] || platformColors.web_lynx;

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
            {PLATFORM_DISPLAY_NAMES[selectedPlatform]} {t.coverage}
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
