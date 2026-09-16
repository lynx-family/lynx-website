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
