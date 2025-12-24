import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
import { PlatformIcon } from './PlatformIcon';
import { Platform } from './types';
import { Link } from '@rspress/core/theme';

interface CardLinkTabProps {
  /** Whether this tab is currently active */
  active?: boolean;
  /** The URL to navigate to when clicked */
  to: string;
  /** Child components to render within the tab */
  children: React.ReactNode;
  /** Optional className for styling */
  className?: string;
  /** Optional platforms to show icons for */
  platforms?: Platform[];
}

/**
 * Component for rendering a single card link tab
 */
const CardLinkTab = ({
  active,
  to,
  children,
  className,
  platforms,
}: CardLinkTabProps) => {
  return (
    <Link
      href={to}
      className="no-underline basis-[calc(50%-0.5rem)] max-w-[calc(50%-0.5rem)] flex-grow"
    >
      <Card
        className={cn(
          'cursor-pointer transition-colors border-2',
          active
            ? 'border-primary bg-primary/10'
            : 'border-muted hover:bg-muted',
          className,
        )}
      >
        <CardContent className="pt-4 pb-4 flex flex-col items-center gap-3">
          {platforms && <PlatformIcon platforms={platforms} />}
          {children}
        </CardContent>
      </Card>
    </Link>
  );
};

interface CardLinkGroupProps {
  /** Child components to render within the group */
  children: React.ReactNode;
  /** Optional className for styling */
  className?: string;
}

/**
 * A group of card-based links that look like tabs but navigate to URLs when clicked.
 * Supports showing platform icons and matches the styling of PlatformTabs.
 *
 * @example
 * ```tsx
 * <CardLinkGroup>
 *   <CardLinkGroup.Tab
 *     active
 *     to="/docs/ios"
 *     platforms={['ios', 'ios-simulator']}
 *   >
 *     iOS Documentation
 *   </CardLinkGroup.Tab>
 *   <CardLinkGroup.Tab
 *     to="/docs/android"
 *     platforms={['android']}
 *   >
 *     Android Documentation
 *   </CardLinkGroup.Tab>
 * </CardLinkGroup>
 * ```
 */
export const CardLinkGroup = ({ children, className }: CardLinkGroupProps) => {
  return (
    <div className={cn('w-full flex flex-wrap gap-4', className)}>
      {children}
    </div>
  );
};

CardLinkGroup.Tab = CardLinkTab;
