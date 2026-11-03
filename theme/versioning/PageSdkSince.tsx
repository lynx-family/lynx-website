import { useI18n, usePage, useSite } from '@rspress/core/runtime';

import type messages from '../../i18n.json';
import release from '../../src/versioning/lynx-sdk-release.json';
import {
  isSdkSinceGuide,
  isSdkSinceLayout,
  resolveSdkSince,
  shouldHideSdkSince,
  type SdkVersioning,
} from '../../src/versioning/page-sdk-since';

import './PageSdkSince.scss';

export default function PageSdkSince({
  format = 'html',
}: {
  format?: 'html' | 'markdown';
}) {
  const { page } = usePage();
  const { site } = useSite();
  const t = useI18n<typeof messages>();
  if (
    !isSdkSinceGuide(page._relativePath ?? '') ||
    !isSdkSinceLayout(page.pageType)
  ) {
    return null;
  }
  // Older consumers without the plugin retain the existing release-only behavior.
  const sdkVersioning: SdkVersioning =
    (site.themeConfig as { sdkVersioning?: SdkVersioning }).sdkVersioning ??
    release;
  const version = resolveSdkSince(
    page.frontmatter?.since,
    sdkVersioning.latestStable,
  );
  if (!version) return null;
  if (
    format !== 'markdown' &&
    shouldHideSdkSince(version.since, sdkVersioning.baseline)
  ) {
    return null;
  }

  return (
    <p className="page-sdk-since">
      {t(version.prerelease ? 'sdk.since.prerelease' : 'sdk.since.released', {
        version: version.since,
      })}
    </p>
  );
}
