import { cn } from '@/lib/utils';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { PLATFORM_CONFIG } from './constants';

interface CoverageCardProps {
  platform: string;
  displayName: string;
  supported: number;
  total: number;
  coverage: number;
  isHighlighted?: boolean;
}

export const CoverageCard: React.FC<CoverageCardProps> = ({
  platform,
  displayName,
  supported,
  total,
  coverage,
  isHighlighted = false,
}) => {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.android;
  const { colors, icon: Icon } = config;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
        isHighlighted && 'ring-2 ring-primary ring-offset-2',
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br pointer-events-none',
          colors.bg,
        )}
      />
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', colors.text)} />
            <CardTitle className="text-base font-semibold">
              {displayName}
            </CardTitle>
          </div>
          <span className={cn('text-2xl font-bold font-mono', colors.text)}>
            {coverage}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative pt-0">
        <Progress
          value={coverage}
          className="h-2 mb-2"
          indicatorClassName={colors.progress}
        />
        <p className="text-xs text-muted-foreground font-mono">
          {supported.toLocaleString()} / {total.toLocaleString()} APIs
        </p>
      </CardContent>
    </Card>
  );
};

export default CoverageCard;
