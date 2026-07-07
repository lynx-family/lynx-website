import type { SubsiteConfig } from '@site/shared-route-config';
import { withBase } from '@rspress/core/runtime';

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function resolveLogoUrl(url: string): string {
  if (isExternalUrl(url)) return url;
  if (url.startsWith('/')) return withBase(url);
  return url;
}

export function SubsiteLogo({ subsite }: { subsite: SubsiteConfig }) {
  const lightLogoSrc = resolveLogoUrl(subsite.logo.light);
  const darkLogoSrc = resolveLogoUrl(subsite.logo.dark);

  return (
    <>
      <img
        src={lightLogoSrc}
        className="w-full h-full object-contain dark:hidden"
        alt={`${subsite.label} logo`}
      />
      <img
        src={darkLogoSrc}
        className="hidden w-full h-full object-contain dark:block"
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
