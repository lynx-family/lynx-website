import { usePage, useSite } from '@rspress/core/runtime';

import { Since } from '../../src/components/versioning';
import release from '../../src/versioning/lynx-sdk-release.json';
import {
  isSdkSinceGuide,
  isSdkSinceLayout,
  type SdkVersioning,
} from '../../src/versioning/page-sdk-since';

interface PageSdkSinceProps {
  format?: 'html' | 'markdown';
}

export default function PageSdkSince({ format = 'html' }: PageSdkSinceProps) {
  const { page } = usePage();
  const { site } = useSite();
  if (!isSdkSinceGuide(page.pagePath) || !isSdkSinceLayout(page.pageType)) {
    return null;
  }
  // Older consumers without the plugin retain the existing release-only behavior.
  const sdkVersioning: SdkVersioning =
    (site.themeConfig as { sdkVersioning?: SdkVersioning }).sdkVersioning ??
    release;
  return (
    <Since
      since={page.frontmatter?.since}
      latestStable={sdkVersioning.latestStable}
      baseline={sdkVersioning.baseline}
      format={format}
    />
  );
}
