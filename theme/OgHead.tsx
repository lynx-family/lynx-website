/**
 * Per-page Open Graph / Twitter Card meta tags, injected from the theme so the
 * correct (unique) image and canonical URL are emitted per route.
 *
 * The theme owns OG meta entirely — the global `pluginOpenGraph` was removed
 * from rspress.config.ts to avoid duplicate `og:image` tags that confuse
 * crawlers (some take the first tag and ignore later overrides).
 *
 * Image selection is deterministic via `selectOg()` in shared-og-config.ts and
 * matches the assets emitted at build time by `scripts/og/generate.ts`.
 */
import {
  Head,
  removeBase,
  useLang,
  useLocation,
  usePageData,
} from '@rspress/core/runtime';
import {
  OG_BASE,
  getCover,
  ogAbsolute,
  selectOg,
} from '@site/shared-og-config';

const TWITTER_SITE = '@LynxJS_org';
/** Keep og:description bounded — blog descriptions can be long. */
const DESCRIPTION_MAX = 120;

function clamp(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default function OgHead() {
  const { pathname } = useLocation();
  const lang = useLang();
  const { page, siteData } = usePageData();

  const pathNoBase = removeBase(pathname);
  const selection = selectOg(pathNoBase, lang);
  const image = ogAbsolute(selection.imagePath);
  const canonical = ogAbsolute(`${OG_BASE}${pathNoBase}`);
  const isBlog = selection.kind === 'blog';

  const frontmatter = (page.frontmatter ?? {}) as Record<string, unknown>;
  const title =
    (page.title as string) ||
    (frontmatter.title as string) ||
    siteData?.title ||
    'Lynx';

  // Blog: bounded frontmatter description. Docs: the subsite/site description.
  let description = isBlog
    ? clamp(frontmatter.description, DESCRIPTION_MAX)
    : undefined;
  if (!isBlog) {
    const cover =
      selection.kind === 'cover' ? getCover(selection.value) : undefined;
    description =
      (cover && (lang === 'zh' ? cover.descriptionZh : cover.description)) ||
      siteData?.description ||
      undefined;
  }

  return (
    <Head>
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content={siteData?.title || 'Lynx'} />
      <meta property="og:title" content={title} />
      {description ? (
        <meta property="og:description" content={description} />
      ) : null}
      <meta property="og:type" content={isBlog ? 'article' : 'website'} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_SITE} />
      <meta name="twitter:title" content={title} />
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
