import { usePageData } from '@rspress/core/runtime';
import { EditLink as OriginalEditLink } from '@rspress/core/theme-original';

import { isGeneratedApiPage } from './api-reference';

type Props = Parameters<typeof OriginalEditLink>[0];

export function EditLink(props: Props) {
  const { page } = usePageData();
  // The API reference is generated from the TSDoc of lynx-stack; there is no
  // page in either repository to edit.
  if (isGeneratedApiPage(page._relativePath)) return null;
  return <OriginalEditLink {...props} />;
}
