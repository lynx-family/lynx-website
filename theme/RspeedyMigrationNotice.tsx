import {
  removeBase,
  useI18n,
  useLang,
  useLocation,
} from '@rspress/core/runtime';

import { Callout } from '@rspress/core/theme-original';

// Historical Rspeedy pages link to the maintained migration guide.
const MIGRATION_GUIDE: Record<string, string> = {
  en: 'https://lynxjs.org/next/guide/build/rspeedy.html#migrating-an-rspeedy-project',
  zh: 'https://lynxjs.org/next/zh/guide/build/rspeedy.html#migrating-an-rspeedy-project',
};

export default function RspeedyMigrationNotice() {
  const t = useI18n();
  const lang = useLang();
  const { pathname } = useLocation();

  const route = removeBase(pathname)
    .replace(/^\/zh(?=\/)/, '')
    .replace(/\.html$/, '')
    .replace(/\/$/, '');
  const isLegacyRspeedy = route === '/rspeedy' || route.startsWith('/rspeedy/');
  if (!isLegacyRspeedy) {
    return null;
  }

  return (
    <Callout type="info">
      <p>
        <span>{t('rspeedy.migration.notice')}</span>{' '}
        <a href={MIGRATION_GUIDE[lang] ?? MIGRATION_GUIDE.en}>
          {t('rspeedy.migration.action')}
        </a>
      </p>
    </Callout>
  );
}
