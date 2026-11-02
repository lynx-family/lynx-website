import { useI18n, usePage } from '@rspress/core/runtime';

import type messages from '../../i18n.json';
import release from '../../src/versioning/lynx-sdk-release.json';
import {
  isSdkSinceGuide,
  isSdkSinceLayout,
  resolveSdkSince,
} from '../../src/versioning/page-sdk-since';

import './PageSdkSince.scss';

export default function PageSdkSince() {
  const { page } = usePage();
  const t = useI18n<typeof messages>();
  if (!isSdkSinceGuide(page.pagePath) || !isSdkSinceLayout(page.pageType)) {
    return null;
  }
  const version = resolveSdkSince(
    page.frontmatter?.since,
    release.latestStable,
  );
  if (!version) return null;

  return (
    <p className="page-sdk-since">
      {t(version.prerelease ? 'sdk.since.prerelease' : 'sdk.since.released', {
        version: version.since,
      })}
    </p>
  );
}
