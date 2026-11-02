import { useState, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

import styles from './SinceIndicator.module.css';

interface SinceIndicatorProps {
  label: string;
  description: ReactNode;
  tooltip: string;
  showReleaseStatus: boolean;
  /** Container, capsule, and icon-slot overrides owned by each renderer. */
  className?: string;
  capsuleClassName?: string;
  iconClassName?: string;
}

function SinceIcon({
  ahead,
  className,
}: {
  ahead: boolean;
  className?: string;
}) {
  return (
    <svg
      className={cn(
        'sdk-since-indicator__icon block size-[var(--icon-size,14px)] flex-none text-[var(--sdk-since-icon-color)]',
        className,
      )}
      viewBox={ahead ? '0 0 256 256' : '0 0 172 256'}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M64 22 V162 A24 24 0 0 0 88 186 H156 V234 H64 A48 48 0 0 1 16 186 V70 A48 48 0 0 1 64 22 Z" />
      {ahead && (
        <path d="M188 18 Q198.1 63.9 244 74 Q198.1 84.1 188 130 Q177.9 84.1 132 74 Q177.9 63.9 188 18 Z" />
      )}
    </svg>
  );
}

/** Shared HTML interaction; callers own its scope, styling and Markdown. */
export function SinceIndicator({
  label,
  description,
  tooltip,
  showReleaseStatus,
  className,
  capsuleClassName,
  iconClassName,
}: SinceIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const containerClass = cn('sdk-since-indicator mb-2.5 max-w-full', className);
  const capsuleClass =
    'sdk-since-indicator__capsule inline-flex min-h-6 max-w-full items-center gap-[7px] rounded-[6px] bg-[var(--sdk-since-background)] py-[3px] pl-[7px] pr-2 align-middle text-xs font-medium leading-normal text-secondary-foreground';

  if (!showReleaseStatus) {
    return (
      <div className={containerClass}>
        <span className={cn(capsuleClass, capsuleClassName)}>
          <SinceIcon ahead={false} className={iconClassName} />
          <span>{label}</span>
        </span>
      </div>
    );
  }

  return (
    <Collapsible
      className={containerClass}
      open={expanded}
      onOpenChange={(open) => {
        setExpanded(open);
        setTooltipOpen(false);
      }}
    >
      <TooltipProvider delayDuration={150} skipDelayDuration={0}>
        <Tooltip open={!expanded && tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <CollapsibleTrigger
              className={cn(
                capsuleClass,
                'sdk-since-indicator__trigger group/sdk-since cursor-pointer border-0 text-left transition-[background] [transition-duration:180ms] [transition-timing-function:ease] hover:bg-[var(--sdk-since-hover-background)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:duration-0',
                capsuleClassName,
              )}
            >
              <SinceIcon ahead className={iconClassName} />
              <span>{label}</span>
              <svg
                className="sdk-since-indicator__chevron ml-0.5 size-2.5 flex-none transition-transform [transition-duration:180ms] [transition-timing-function:ease] group-data-[state=open]/sdk-since:rotate-180 motion-reduce:transition-none motion-reduce:duration-0"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </CollapsibleTrigger>
          </TooltipTrigger>
          <TooltipContent
            className="sdk-since-indicator__tooltip max-w-[calc(100vw-24px)] border-0 bg-foreground px-[9px] py-[5px] text-xs leading-normal text-background motion-reduce:animate-none motion-reduce:data-[state=closed]:animate-none"
            side="top"
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <CollapsibleContent
        className={cn(
          'sdk-since-indicator__content overflow-hidden',
          styles.content,
        )}
      >
        <p
          className={cn(
            'sdk-since-indicator__description max-w-[60ch] text-[0.78125rem] text-secondary-foreground [&&]:mb-0 [&&]:mt-2 [&&]:leading-[1.6]',
            // Match page chrome and MDX, overriding the theme's external-link decoration.
            '[&&_a[href][target]]:mt-1 [&&_a[href][target]]:block [&&_a[href][target]]:w-fit [&&_a[href][target]]:text-primary [&&_a[href][target]]:no-underline [&&_a[href][target]]:underline-offset-4',
            "[&&_a[href][target]::before]:content-none [&&_a[href][target]::after]:ml-[0.2em] [&&_a[href][target]::after]:mr-[0.1em] [&&_a[href][target]::after]:inline-block [&&_a[href][target]::after]:translate-y-[-0.3em] [&&_a[href][target]::after]:text-[0.7em] [&&_a[href][target]::after]:font-bold [&&_a[href][target]::after]:content-['↗']",
            '[&&_a[href][target]:hover]:underline [&&_a[href][target]:focus-visible]:underline [&&_a[href][target]:focus-visible]:outline [&&_a[href][target]:focus-visible]:outline-2 [&&_a[href][target]:focus-visible]:outline-offset-2 [&&_a[href][target]:focus-visible]:outline-ring',
            '[&&_a[href][target]::after]:transition-transform [&&_a[href][target]::after]:duration-200 [&&_a[href][target]::after]:[transition-timing-function:ease] motion-safe:[&&_a[href][target]:hover::after]:translate-x-[0.1em] motion-safe:[&&_a[href][target]:hover::after]:translate-y-[-0.5em] motion-safe:[&&_a[href][target]:focus-visible::after]:translate-x-[0.1em] motion-safe:[&&_a[href][target]:focus-visible::after]:translate-y-[-0.5em] motion-reduce:[&&_a[href][target]::after]:transition-none motion-reduce:[&&_a[href][target]:hover::after]:translate-x-0 motion-reduce:[&&_a[href][target]:hover::after]:translate-y-[-0.3em]',
          )}
        >
          {description}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
