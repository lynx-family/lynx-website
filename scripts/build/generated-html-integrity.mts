/**
 * Check before any HTML cleanup so rendering defects cannot be silently
 * published. NUL is invalid HTML input and can corrupt fragment targets.
 */
export function assertNoNullCharacters(html: string, pagePath: string): void {
  const offset = html.indexOf('\u0000');
  if (offset === -1) return;
  const before = html.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - before.lastIndexOf('\n');
  throw new Error(
    `${pagePath}:${line}:${column}: generated HTML contains U+0000. ` +
      'Check the documentation source and SSR renderer; ' +
      'React 18.3.1 requires the committed UTF-8 streaming patch.',
  );
}
