import { usePageData } from '@rspress/core/runtime';
import { EditLink as OriginalEditLink } from '@rspress/core/theme-original';

import manifest from '@lynx-js/lynx-stack-docs/manifest.json';

const routes = manifest.sections.map((section) => section.route);

type Props = Parameters<typeof OriginalEditLink>[0];

export function EditLink(props: Props) {
  const { page } = usePageData();
  const path = page._relativePath.replace(/\\/g, '/');
  const pathInLocale = path.slice(path.indexOf('/') + 1);
  // The API reference is generated from the TSDoc of lynx-stack; there is no
  // page in either repository to edit.
  if (routes.some((route) => pathInLocale.startsWith(`${route}/`))) return null;
  return <OriginalEditLink {...props} />;
}
