import { useI18n, usePageData } from 'rspress/runtime';
import { Button } from '../ui/button';

interface Props {
  /**
   * If path is not provided, we will use the current page path and assume it's a `md` or `mdx` file.
   */
  path?: string;
}

/**
 * TODO(xuan.huang):
 * - [] tweak the style
 * - [] use it within the new APITable
 */
export default function EditThis({ path }: Props) {
  const pageData = usePageData();
  const t = useI18n();

  let basePath = '';
  if (!path) {
    basePath = `docs/${pageData.page.pagePath}`;
  } else {
    basePath = `${path}`;
  }
  const sourcePath = `${process.env.DOC_GIT_BASE_URL}/${basePath}`;

  return (
    <div className="sh-flex sh-space-x-2">
      {process.env.DOC_GIT_BASE_URL && (
        <Button variant="outline" size="sm">
          <a href={sourcePath}>{t('edit.source')}</a>
        </Button>
      )}
      {process.env.CODE_IDE_BASE_URL && (
        <Button variant="outline" size="sm">
          <a href={`${process.env.CODE_IDE_BASE_URL}/${basePath}`}>
            {t('edit.cloud-ide')}
          </a>
        </Button>
      )}
    </div>
  );
}
