import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
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
}

/**
 * Component for rendering a single card link tab
 */
const CardLinkTab = ({
  active,
  to: url,
  children,
  className,
}: CardLinkTabProps) => {
  return (
    <Link href={url} className="no-underline">
      <Card
        className={cn(
          'flex-1 cursor-pointer transition-colors border-2',
          active
            ? 'border-primary bg-primary/10'
            : 'border-muted hover:bg-muted',
          className,
        )}
      >
        <CardContent className="pt-4 pb-4 flex flex-col items-center gap-3">
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
 *
 * @example
 * ```tsx
 * <CardLinkGroup>
 *   <CardLinkGroup.Tab active url="/docs/ios">
 *     <div className="icon icon-ios bg-current h-8 w-8" />
 *     <span>iOS Documentation</span>
 *   </CardLinkGroup.Tab>
 *   <CardLinkGroup.Tab url="/docs/android">
 *     <div className="icon icon-android bg-current h-8 w-8" />
 *     <span>Android Documentation</span>
 *   </CardLinkGroup.Tab>
 * </CardLinkGroup>
 * ```
 */
export const CardLinkGroup = ({ children, className }: CardLinkGroupProps) => {
  return (
    <div className={cn('flex flex-wrap gap-4', className)}>{children}</div>
  );
};

CardLinkGroup.Tab = CardLinkTab;
