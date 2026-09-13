function normalizeDocPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0];
  const withoutHtml = pathname.replace(/\.html$/, '');
  const withoutIndex = withoutHtml.replace(/\/index$/, '');
  return withoutIndex.replace(/\/+$/, '') || '/';
}

export function isCurrentDocPath(
  currentPathname: string,
  targetPath: string,
): boolean {
  const current = normalizeDocPath(currentPathname);
  const target = normalizeDocPath(`/${targetPath.replace(/^\/+/, '')}`);
  return current === target || current.endsWith(target);
}
