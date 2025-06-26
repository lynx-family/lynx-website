import { useI18n, usePageData } from '@rspress/core/runtime';

export const Footer = () => {
  const t = useI18n();
  const { page } = usePageData();

  return (
    <div
      className={`${page.pageType === 'home' ? 'sh-px-6' : 'sh-pt-8'} sh-text-center sh-text-sm sh-pb-16`}
    >
      <div
        className="sh-w-full sh-pt-8"
        style={{ borderTop: '1px solid var(--rp-c-divider-light)' }}
      ></div>
      <div style={{ color: 'var(--home-showcase-item-desc-color)' }}>
        {t('homepage.footer.license')}
      </div>
    </div>
  );
};
