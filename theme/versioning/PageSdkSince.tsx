import { usePage } from '@rspress/core/runtime';

import { SinceIndicator } from '../../src/components/version-info/SinceIndicator';
import { useSdkSince } from '../../src/components/version-info/useSdkSince';
import {
  isSdkSinceGuide,
  isSdkSinceLayout,
} from '../../src/versioning/sdk-since';

interface PageSdkSinceProps {
  format?: 'html' | 'markdown';
}

export default function PageSdkSince({ format = 'html' }: PageSdkSinceProps) {
  const { page } = usePage();
  const eligible =
    isSdkSinceGuide(page.pagePath) && isSdkSinceLayout(page.pageType);
  const requirement = useSdkSince({
    since: eligible ? page.frontmatter?.since : undefined,
  });
  if (!requirement) return null;

  // Page Markdown has its own output contract, independent of local callouts.
  if (import.meta.env?.SSG_MD || format === 'markdown') {
    return (
      <>
        <p>{requirement.label}</p>
        {requirement.description && <p>{requirement.description}</p>}
      </>
    );
  }
  if (requirement.hidden) return null;

  return (
    <div className="sdk-since sdk-since--page [--sdk-since-icon-color:var(--rp-c-text-1)] [--sdk-since-background:color-mix(in_srgb,var(--rp-c-text-1)_5.5%,var(--rp-c-bg))] [--sdk-since-hover-background:color-mix(in_srgb,var(--rp-c-text-1)_9%,var(--rp-c-bg))]">
      <SinceIndicator {...requirement} />
    </div>
  );
}
