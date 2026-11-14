import { usePageData } from '@rspress/core/runtime';
import { useI18n } from '@/hooks/use-i18n';
import {
  EditLink as OriginalEditLink,
  IconEdit,
  SvgWrapper,
} from '@rspress/core/theme-original';

import { isGeneratedApiPage } from './api-reference';

type Props = Parameters<typeof OriginalEditLink>[0];

export function EditLink(props: Props) {
  const { page } = usePageData();
  const t = useI18n();
  const sourceEditUrl = page.frontmatter.sourceEditUrl;
  if (typeof sourceEditUrl === 'string') {
    return (
      <a
        href={sourceEditUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={
          props.isOutline
            ? 'rp-outline__action-row rp-edit-link'
            : 'rp-edit-link'
        }
      >
        {props.isOutline && (
          <SvgWrapper icon={IconEdit} width="16" height="16" />
        )}
        {t('editLinkText')}
      </a>
    );
  }
  // The API reference is generated from the TSDoc of lynx-stack; there is no
  // page in either repository to edit.
  if (isGeneratedApiPage(page.pagePath)) return null;
  return <OriginalEditLink {...props} />;
}
