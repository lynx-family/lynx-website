import { cn } from '@/lib/utils';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';

interface CoverageCardProps {
  platform: string;
  displayName: string;
  supported: number;
  total: number;
  coverage: number;
  isHighlighted?: boolean;
}

const platformColors: Record<
  string,
  { bg: string; indicator: string; text: string }
> = {
  android: {
    bg: 'sh-from-emerald-500/10 sh-to-emerald-600/5',
    indicator: 'sh-bg-emerald-500',
    text: 'sh-text-emerald-700 dark:sh-text-emerald-400',
  },
  ios: {
    bg: 'sh-from-blue-500/10 sh-to-blue-600/5',
    indicator: 'sh-bg-blue-500',
    text: 'sh-text-blue-700 dark:sh-text-blue-400',
  },
  harmony: {
    bg: 'sh-from-orange-500/10 sh-to-orange-600/5',
    indicator: 'sh-bg-orange-500',
    text: 'sh-text-orange-700 dark:sh-text-orange-400',
  },
  web_lynx: {
    bg: 'sh-from-purple-500/10 sh-to-purple-600/5',
    indicator: 'sh-bg-purple-500',
    text: 'sh-text-purple-700 dark:sh-text-purple-400',
  },
  clay_android: {
    bg: 'sh-from-teal-500/10 sh-to-teal-600/5',
    indicator: 'sh-bg-teal-500',
    text: 'sh-text-teal-700 dark:sh-text-teal-400',
  },
  clay_ios: {
    bg: 'sh-from-cyan-500/10 sh-to-cyan-600/5',
    indicator: 'sh-bg-cyan-500',
    text: 'sh-text-cyan-700 dark:sh-text-cyan-400',
  },
  clay_harmony: {
    bg: 'sh-from-indigo-500/10 sh-to-indigo-600/5',
    indicator: 'sh-bg-indigo-500',
    text: 'sh-text-indigo-700 dark:sh-text-indigo-400',
  },
  clay_web: {
    bg: 'sh-from-sky-500/10 sh-to-sky-600/5',
    indicator: 'sh-bg-sky-500',
    text: 'sh-text-sky-700 dark:sh-text-sky-400',
  },
  clay_macos: {
    bg: 'sh-from-indigo-500/10 sh-to-indigo-600/5',
    indicator: 'sh-bg-indigo-500',
    text: 'sh-text-indigo-700 dark:sh-text-indigo-400',
  },
  clay_windows: {
    bg: 'sh-from-sky-500/10 sh-to-sky-600/5',
    indicator: 'sh-bg-sky-500',
    text: 'sh-text-sky-700 dark:sh-text-sky-400',
  },
};

const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  // Clay icon (cube shape)
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
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M12 2 L12 22 M2 12 L22 12"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
    web_lynx: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
    clay_android: ClayIcon,
    clay_ios: ClayIcon,
    clay_macos: ClayIcon,
    clay_windows: ClayIcon,
    clay_harmony: ClayIcon,
    clay_web: ClayIcon,
  };

  return icons[platform] || null;
};

export const CoverageCard: React.FC<CoverageCardProps> = ({
  platform,
  displayName,
  supported,
  total,
  coverage,
  isHighlighted = false,
}) => {
  const colors = platformColors[platform] || platformColors.android;

  return (
    <Card
      className={cn(
        'sh-relative sh-overflow-hidden sh-transition-all sh-duration-300 hover:sh-shadow-lg',
        isHighlighted && 'sh-ring-2 sh-ring-primary sh-ring-offset-2',
      )}
    >
      <div
        className={cn(
          'sh-absolute sh-inset-0 sh-bg-gradient-to-br sh-pointer-events-none',
          colors.bg,
        )}
      />
      <CardHeader className="sh-relative sh-pb-2">
        <div className="sh-flex sh-items-center sh-justify-between">
          <div className="sh-flex sh-items-center sh-gap-2">
            <PlatformIcon
              platform={platform}
              className={cn('sh-w-5 sh-h-5', colors.text)}
            />
            <CardTitle className="sh-text-base sh-font-semibold">
              {displayName}
            </CardTitle>
          </div>
          <span
            className={cn('sh-text-2xl sh-font-bold sh-font-mono', colors.text)}
          >
            {coverage}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="sh-relative sh-pt-0">
        <Progress
          value={coverage}
          className="sh-h-2 sh-mb-2"
          indicatorClassName={colors.indicator}
        />
        <p className="sh-text-xs sh-text-muted-foreground sh-font-mono">
          {supported.toLocaleString()} / {total.toLocaleString()} APIs
        </p>
      </CardContent>
    </Card>
  );
};

export default CoverageCard;
