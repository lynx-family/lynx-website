import { useI18n, usePageData } from 'rspress/runtime';

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
    <div className="sh-flex sh-items-center sh-gap-2 sh-text-sm -sh-mb-3">
      {process.env.DOC_GIT_BASE_URL && (
        <a
          href={sourcePath}
          target="_blank"
          rel="noopener noreferrer"
          className="sh-text-[var(--custom-link-color)] hover:sh-opacity-85"
          title={t('edit.source')}
        >
          {t('edit.source')}
        </a>
      )}
      {process.env.CODE_IDE_BASE_URL && (
        <a
          href={`${process.env.CODE_IDE_BASE_URL}/${basePath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="sh-text-[var(--custom-link-color)] hover:sh-opacity-85"
          title={t('edit.cloud-ide')}
        >
          {t('edit.cloud-ide')}
        </a>
      )}
    </div>
  );
}
