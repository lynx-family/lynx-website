import type { SubsiteConfig } from '../shared-route-config';

export function SubsiteLogo({ subsite }: { subsite: SubsiteConfig }) {
  return (
    <>
      <img
        src={subsite.logo.light}
        // "dark:rp-hidden" is in the @rspress/theme-default CSS
        className="sh-w-full sh-h-full sh-object-contain dark:rp-hidden"
        alt={`${subsite.label} logo`}
      />
      <img
        src={subsite.logo.dark}
        className="sh-hidden sh-w-full sh-h-full sh-object-contain dark:rp-block"
        alt={`${subsite.label} logo`}
      />
    </>
  );
}

export function SubsiteView({
  subsite,
  lang,
  size = 'default',
}: {
  subsite: SubsiteConfig;
  lang: string;
  size?: 'default' | 'large' | 'minimal';
}) {
  return (
    <div className="sh-flex sh-items-center sh-gap-3">
      <div
        className={`sh-relative ${size === 'large' ? 'sh-h-8 sh-w-8' : 'sh-h-6 sh-w-6'}`}
      >
        <SubsiteLogo subsite={subsite} />
      </div>
      <div className="sh-flex sh-flex-col sh-items-start">
        <span
          className={`sh-font-medium sh-text-foreground ${size === 'large' ? 'sh-text-base' : 'sh-text-sm'}`}
        >
          {subsite.label}
        </span>
        {size !== 'minimal' && (
          <span
            className={`sh-text-muted-foreground ${size === 'large' ? 'sh-text-sm' : 'sh-text-xs'}`}
          >
            {lang === 'zh' ? subsite.descriptionZh : subsite.description}
          </span>
        )}
      </div>
    </div>
  );
}
