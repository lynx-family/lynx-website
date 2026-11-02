import { useI18n, useSite } from '@rspress/core/runtime';

import type messages from '../../../i18n.json';
import release from '../../versioning/lynx-sdk-release.json';
import {
  resolveSdkSince,
  shouldHideSdkSince,
  type SdkVersioning,
} from '../../versioning/sdk-since';

export interface SdkSinceOptions extends Partial<
  Pick<SdkVersioning, 'latestStable' | 'baseline'>
> {
  since?: unknown;
}

/** Share version facts and copy, leaving HTML and Markdown to each consumer. */
export function useSdkSince({
  since,
  latestStable: latestStableOverride,
  baseline: baselineOverride,
}: SdkSinceOptions) {
  const t = useI18n<typeof messages>();
  const { site } = useSite();
  // Older consumers without the plugin retain the release-only default.
  const sdkVersioning: SdkVersioning =
    (site.themeConfig as { sdkVersioning?: SdkVersioning }).sdkVersioning ??
    release;
  const latestStable = latestStableOverride ?? sdkVersioning.latestStable;
  const baseline = baselineOverride ?? sdkVersioning.baseline;
  const resolvedSince = resolveSdkSince(since, latestStable);
  if (!resolvedSince) return null;
  const showReleaseStatus =
    sdkVersioning.showReleaseStatus !== false && resolvedSince.isAheadOfStable;

  return {
    label: t('sdk.since.released', { sdkVersion: resolvedSince.since }),
    showReleaseStatus,
    hidden: shouldHideSdkSince(resolvedSince.since, baseline),
    tooltip: t('sdk.since.tooltip'),
    description: showReleaseStatus ? (
      <>
        <strong>{t('sdk.since.ahead')}</strong>{' '}
        {t('sdk.since.description', {
          sdkVersion: resolvedSince.since,
          latestStable,
        })}{' '}
        <a
          href="https://github.com/lynx-family/lynx/releases"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('sdk.since.releases')}
        </a>
      </>
    ) : null,
  };
}
