import { SUBSITES_CONFIG, type SubsiteConfig } from '@route-config';
import { Head, withBase } from '@rspress/core/runtime';

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function resolveLogoUrl(url: string): string {
  if (isExternalUrl(url)) return url;
  if (url.startsWith('/')) return withBase(url);
  return url;
}

export function SubsiteBlogStyles() {
  // Reuse the host's public logo URLs rather than bundling another SVG copy.
  // Head preserves these base-aware URLs in both SSG and client navigation.
  const styles = SUBSITES_CONFIG.filter(
    ({ value }) => value === 'ui' || value === 'lynxtron',
  )
    .map(
      ({ value, logo }) =>
        `:root[data-subsite="${value}"]{--home-blog-bg-img:url(${JSON.stringify(resolveLogoUrl(logo.light))})}` +
        `:root.dark[data-subsite="${value}"]{--home-blog-bg-img:url(${JSON.stringify(resolveLogoUrl(logo.dark))})}`,
    )
    .join('\n');
  return (
    <Head>
      <style>{styles}</style>
    </Head>
  );
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
