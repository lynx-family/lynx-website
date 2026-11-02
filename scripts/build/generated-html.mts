type GeneratedPage = {
  siteUrl: string;
  base: string;
  /** Output path relative to outDir, using forward slashes. */
  pagePath: string;
};

// Match the route shape Rspress serves: `foo.html` and `foo/index.html`
// both resolve to `/foo`.
export function normalizeGeneratedRoute(route: string): string {
  let normalized = route.replace(/\\/g, '/');
  if (normalized.endsWith('.html')) normalized = normalized.slice(0, -5);
  normalized = normalized.replace(/\/index$/, '');
  if (normalized === 'index') normalized = '';
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '');
  return normalized || '/';
}

/**
 * Repairs HTML language alternates whose targets are missing from this build.
 * Resource discovery links (Markdown, RSS, etc.) have a separate contract and
 * must never be validated against the HTML route set.
 *
 * These expressions target Rspress-generated, quoted HTML attributes, rather
 * than parsing every page into a DOM during build postprocessing.
 */
export function removeBrokenLanguageAlternates(
  html: string,
  routes: ReadonlySet<string>,
  page: GeneratedPage,
): string {
  const siteBase = new URL(page.base, page.siteUrl);
  siteBase.pathname = `${siteBase.pathname.replace(/\/+$/, '')}/`;
  const pageUrl = new URL(page.pagePath, siteBase);
  const basePrefix = decodeURIComponent(siteBase.pathname).replace(/\/+$/, '');

  const isMissingLanguageRoute = (tag: string): boolean => {
    const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/);
    if (!rel?.includes('alternate') || !attribute(tag, 'hreflang'))
      return false;
    const type = attribute(tag, 'type');
    if (type !== undefined && type.trim().toLowerCase() !== 'text/html') {
      return false;
    }
    const href = attribute(tag, 'href');
    if (!href) return false;

    try {
      const url = new URL(href, pageUrl);
      if (url.origin !== siteBase.origin) return false;
      const pathname = decodeURIComponent(url.pathname);
      // Routes describe only this deployment. In particular, `/next-other`
      // and other version bases cannot be checked against a `/next/` build.
      if (
        basePrefix &&
        pathname !== basePrefix &&
        !pathname.startsWith(`${basePrefix}/`)
      ) {
        return false;
      }
      return !routes.has(
        normalizeGeneratedRoute(pathname.slice(basePrefix.length)),
      );
    } catch {
      return false;
    }
  };

  const withoutBrokenHeadLinks = html.replace(
    /<link\b(?=[^>]*\shreflang\s*=)[^>]*>/gi,
    (tag) => (isMissingLanguageRoute(tag) ? '' : tag),
  );

  // Only language switcher anchors are candidates. Leave ordinary navigation
  // alone; missing language targets become inert entries as in the theme.
  return withoutBrokenHeadLinks.replace(
    /<a\b(?=[^>]*\shreflang\s*=)[^>]*>[\s\S]*?<\/a>/gi,
    (tag) => {
      const openingTag = tag.slice(0, tag.indexOf('>') + 1);
      if (!isMissingLanguageRoute(openingTag)) return tag;
      const disabledOpeningTag = openingTag
        .replace(/^<a\b/i, '<span')
        .replace(/\s+href\s*=\s*(["'])[\s\S]*?\1/i, '')
        .replace(/\s+rel\s*=\s*(["'])[\s\S]*?\1/i, '')
        .replace(/\s+hreflang\s*=\s*(["'])[\s\S]*?\1/i, '')
        .replace(
          /\s+class=["']([^"']*)\brp-link\b([^"']*)["']/,
          ' class="$1$2"',
        )
        .replace(/<span\b/, '<span aria-disabled="true"');
      return (
        disabledOpeningTag +
        tag.slice(openingTag.length).replace(/<\/a>$/i, '</span>')
      );
    },
  );
}

function attribute(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
}
