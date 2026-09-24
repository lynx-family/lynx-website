import { useI18n, useLang, useLocation } from '@rspress/core/runtime';
import { getLangPrefix } from '@site/shared-route-config';

import './RspeedyMigrationNotice.scss';

// 4.1 is the last version that documents Rspeedy here. The guide it points at
// lives on the developing version, which is where the build documentation is
// maintained from now on.
const MIGRATION_GUIDE: Record<string, string> = {
  en: 'https://lynxjs.org/next/guide/build/tools.html#migrating-an-rspeedy-project',
  zh: 'https://lynxjs.org/next/zh/guide/build/tools.html#migrating-an-rspeedy-project',
};

export default function RspeedyMigrationNotice() {
  const t = useI18n();
  const lang = useLang();
  const { pathname } = useLocation();

  const prefix = getLangPrefix(lang);
  const route = pathname.replace(/\.html$/, '').replace(/\/$/, '');
  if (
    route !== `${prefix}/rspeedy` &&
    !route.startsWith(`${prefix}/rspeedy/`)
  ) {
    return null;
  }

  return (
    <aside className="rspeedy-migration-notice">
      <span>{t('rspeedy.migration.notice')}</span>{' '}
      <a href={MIGRATION_GUIDE[lang] ?? MIGRATION_GUIDE.en}>
        {t('rspeedy.migration.action')}
      </a>
    </aside>
  );
}
