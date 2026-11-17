import { useI18n } from '@rspress/core/runtime';
import { useState, type ReactNode } from 'react';

import type messages from '../../../i18n.json';
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
import {
  resolveSdkSince,
  shouldHideSdkSince,
  type SdkVersioning,
} from '../../versioning/page-sdk-since';

import './Since.scss';

const releasesUrl = 'https://github.com/lynx-family/lynx/releases';

interface SinceProps extends SdkVersioning {
  since?: unknown;
  format?: 'html' | 'markdown';
}

function SinceIcon({ ahead }: { ahead: boolean }) {
  return (
    <svg
      className="page-sdk-since__icon"
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

function UnreleasedSince({
  label,
  description,
  tooltip,
}: {
  label: string;
  description: ReactNode;
  tooltip: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Collapsible
      className="page-sdk-since"
      open={expanded}
      onOpenChange={(open) => {
        setExpanded(open);
        setTooltipOpen(false);
      }}
    >
      <TooltipProvider delayDuration={150} skipDelayDuration={0}>
        <Tooltip open={!expanded && tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <CollapsibleTrigger className="page-sdk-since__capsule page-sdk-since__trigger">
              <SinceIcon ahead />
              <span>{label}</span>
              <svg
                className="page-sdk-since__chevron"
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
          <TooltipContent className="page-sdk-since__tooltip" side="top">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <CollapsibleContent className="page-sdk-since__content">
        <p className="page-sdk-since__description">{description}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Render the same SDK indicator in the page layout and component reference. */
export function Since({
  since,
  latestStable,
  baseline,
  format = 'html',
}: SinceProps) {
  const t = useI18n<typeof messages>();
  const resolvedSince = resolveSdkSince(since, latestStable);
  if (!resolvedSince) return null;
  if (
    format !== 'markdown' &&
    shouldHideSdkSince(resolvedSince.since, baseline)
  ) {
    return null;
  }

  const label = t('sdk.since.released', { sdkVersion: resolvedSince.since });
  const description = resolvedSince.isAheadOfStable ? (
    <>
      <strong>{t('sdk.since.ahead')}</strong>{' '}
      {t('sdk.since.description', {
        sdkVersion: resolvedSince.since,
        latestStable,
      })}{' '}
      <a href={releasesUrl}>{t('sdk.since.releases')}</a>
    </>
  ) : null;

  if (format === 'markdown') {
    return (
      <>
        <p>{label}</p>
        {description && <p>{description}</p>}
      </>
    );
  }

  if (resolvedSince.isAheadOfStable) {
    return (
      <UnreleasedSince
        label={label}
        description={description}
        tooltip={t('sdk.since.tooltip')}
      />
    );
  }

  return (
    <div className="page-sdk-since">
      <span className="page-sdk-since__capsule">
        <SinceIcon ahead={false} />
        <span>{label}</span>
      </span>
    </div>
  );
}
