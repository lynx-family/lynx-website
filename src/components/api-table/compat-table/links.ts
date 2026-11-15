/**
 * Use the site's English or Chinese language for MDN documentation links.
 * Preserve the document path, query, and fragment, and leave other URLs alone.
 */
export function localizeMdnUrl(
  url: string | undefined,
  locale: string,
): string | undefined {
  const mdnLocale =
    locale === 'zh' || locale === 'zh-CN'
      ? 'zh-CN'
      : locale === 'en' || locale === 'en-US'
        ? 'en-US'
        : undefined;

  if (!url || !mdnLocale) return url;

  return url.replace(
    /^(https?:\/\/developer\.mozilla\.org\/)[^/]+(?=\/docs(?:\/|[?#]|$))/,
    `$1${mdnLocale}`,
  );
}

/**
 * Reduce a rendered or authored documentation path to its page route.
 *
 * Rspress may render an extensionless route as either `<route>.html` or
 * `<route>/index.html`. Query strings and fragments identify content within
 * the same page, so they do not participate in route comparison.
 */
function normalizeDocPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0];
  const withoutHtml = pathname.replace(/\.html$/, '');
  const withoutIndex = withoutHtml.replace(/\/index$/, '');
  return withoutIndex.replace(/\/+$/, '') || '/';
}

/**
 * Check whether a docs-relative target identifies the currently rendered page.
 *
 * The current pathname may include a deployment or version prefix before the
 * docs route. Both paths are normalized before comparing them so the compat
 * table does not render an API Reference link back to its own page.
 */
export function isCurrentDocPath(
  currentPathname: string,
  targetPath: string,
): boolean {
  const current = normalizeDocPath(currentPathname);
  const target = normalizeDocPath(`/${targetPath.replace(/^\/+/, '')}`);
  return current === target || current.endsWith(target);
}
