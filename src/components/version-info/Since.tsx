import { Children, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Note } from '../Callout';
import { SinceIndicator } from './SinceIndicator';
import { useSdkSince, type SdkSinceOptions } from './useSdkSince';

export interface SinceProps extends SdkSinceOptions {
  children?: ReactNode;
  format?: 'html' | 'markdown';
}

/** Section-level SDK requirements, with optional always-visible content. */
export function Since({ children, format = 'html', ...options }: SinceProps) {
  const requirement = useSdkSince(options);
  // Standalone MDX examples also run in Rspress's Markdown renderer.
  const renderMarkdown = import.meta.env?.SSG_MD || format === 'markdown';
  if (!requirement) return <>{children}</>;
  const hasContent = Children.toArray(children).length > 0;

  // Local Markdown owns grouping independently of page-level output.
  if (renderMarkdown) {
    const content = (
      <>
        <p>{requirement.label}</p>
        {requirement.description && <p>{requirement.description}</p>}
        {children}
      </>
    );
    return hasContent ? <blockquote>{content}</blockquote> : content;
  }

  const indicator = requirement.hidden ? null : (
    <SinceIndicator
      {...requirement}
      className={hasContent ? 'mb-0' : undefined}
      capsuleClassName={
        hasContent
          ? 'bg-transparent p-0 text-sm font-semibold leading-normal text-foreground hover:bg-transparent'
          : undefined
      }
      iconClassName={hasContent ? '[--icon-size:16px]' : undefined}
    />
  );
  if (!hasContent && !indicator) return null;

  return (
    <div
      className={cn(
        'sdk-since sdk-since--local [--sdk-since-icon-color:var(--rp-c-brand)] [--sdk-since-background:var(--rp-container-note-bg)] [--sdk-since-hover-background:color-mix(in_srgb,var(--rp-c-text-1)_3%,var(--rp-container-note-bg))] dark:[--rp-container-note-bg:rgba(255,255,255,0.04)]',
        hasContent &&
          String.raw`sdk-since--note [&>.rp-callout]:border-0 [&>.rp-callout]:px-5 [&>.rp-callout]:py-4 [&>.rp-callout>.rp-callout\_\_title]:hidden`,
      )}
      role={hasContent ? 'note' : undefined}
    >
      {hasContent ? (
        <Note title="">
          <div className="flex flex-col gap-2">
            {indicator}
            <div className="sdk-since__body first:*:mt-0 last:*:mb-0">
              {children}
            </div>
          </div>
        </Note>
      ) : (
        indicator
      )}
    </div>
  );
}
