import type { SubsiteConfig } from '@site/shared-route-config';
import { withBase } from '@rspress/core/runtime';

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('/');
}

export function SubsiteLogo({ subsite }: { subsite: SubsiteConfig }) {
  // Ensure the logo URLs are absolute by prepending the site base if they are relative
  const lightLogoSrc = isAbsoluteUrl(subsite.logo.light)
    ? withBase(subsite.logo.light)
    : subsite.logo.light;
  const darkLogoSrc = isAbsoluteUrl(subsite.logo.dark)
    ? withBase(subsite.logo.dark)
    : subsite.logo.dark;

  return (
    <>
      <img
        src={lightLogoSrc}
        // "dark:rp-hidden" is in the @rspress/theme-default CSS
        className="w-full h-full object-contain dark:rp-hidden"
        alt={`${subsite.label} logo`}
      />
      <img
        src={darkLogoSrc}
        className="hidden w-full h-full object-contain dark:rp-block"
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
    <div className="flex items-center gap-3">
      <div className={`relative ${size === 'large' ? 'h-8 w-8' : 'h-6 w-6'}`}>
        <SubsiteLogo subsite={subsite} />
      </div>
      <div className="flex flex-col items-start">
        <span
          className={`font-medium text-foreground ${size === 'large' ? 'text-base' : 'text-sm'}`}
        >
          {subsite.label}
        </span>
        {size !== 'minimal' && (
          <span
            className={`text-muted-foreground ${size === 'large' ? 'text-sm' : 'text-xs'}`}
          >
            {lang === 'zh' ? subsite.descriptionZh : subsite.description}
          </span>
        )}
      </div>
    </div>
  );
}
