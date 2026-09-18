import { useI18n, usePage } from '@rspress/core/runtime';

interface Props {
  /**
   * Repository-relative source path. When omitted, the current Rspress
   * `pagePath` is used under `docs/` and is expected to retain its `.md` or
   * `.mdx` extension.
   */
  path?: string;
  /**
   * Absolute URL for content maintained outside this repository. It takes
   * precedence over `path` and disables the repository-specific Cloud IDE link.
   */
  sourceUrl?: string;
}

/**
 * Render links for viewing or editing the source behind documentation content.
 *
 * Local sources use the configured repository and Cloud IDE base URLs.
 * External sources expose only their canonical source URL because they cannot
 * be opened through this repository's Cloud IDE integration.
 */
export default function EditThis({ path, sourceUrl }: Props) {
  const { page } = usePage();
  const t = useI18n();

  let basePath = '';
  if (!path) {
    basePath = `docs/${page.pagePath}`;
  } else {
    basePath = `${path}`;
  }
  const sourcePath =
    sourceUrl ||
    (process.env.DOC_GIT_BASE_URL
      ? `${process.env.DOC_GIT_BASE_URL}/${basePath}`
      : undefined);

  return (
    <div className="flex gap-2 items-center text-sm">
      {sourcePath && (
        <a
          href={sourcePath}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--custom-link-color)] hover:opacity-85"
          title={t('edit.source')}
        >
          {t('edit.source')}
        </a>
      )}
      {!sourceUrl && process.env.CODE_IDE_BASE_URL && (
        <a
          href={`${process.env.CODE_IDE_BASE_URL}/${basePath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--custom-link-color)] hover:opacity-85"
          title={t('edit.cloud-ide')}
        >
          {t('edit.cloud-ide')}
        </a>
      )}
    </div>
  );
}
