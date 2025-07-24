import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
import { Link } from 'rspress/theme';

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
    <Link href={url} className="sh-no-underline">
      <Card
        className={cn(
          'sh-flex-1 sh-cursor-pointer sh-transition-colors sh-border-2',
          active
            ? 'sh-border-primary sh-bg-primary/10'
            : 'sh-border-muted hover:sh-bg-muted',
          className,
        )}
      >
        <CardContent className="sh-pt-4 sh-pb-4 sh-flex sh-flex-col sh-items-center sh-gap-3">
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
 *     <div className="icon icon-ios sh-bg-current sh-h-8 sh-w-8" />
 *     <span>iOS Documentation</span>
 *   </CardLinkGroup.Tab>
 *   <CardLinkGroup.Tab url="/docs/android">
 *     <div className="icon icon-android sh-bg-current sh-h-8 sh-w-8" />
 *     <span>Android Documentation</span>
 *   </CardLinkGroup.Tab>
 * </CardLinkGroup>
 * ```
 */
export const CardLinkGroup = ({ children, className }: CardLinkGroupProps) => {
  return (
    <div className={cn('sh-flex sh-flex-wrap sh-gap-4', className)}>
      {children}
    </div>
  );
};

CardLinkGroup.Tab = CardLinkTab;
