/**
 * Matches generated built-in element API bodies without making them routes.
 * Rspress still resolves these files when canonical pages import them.
 */
export const API_PARTIAL_ROUTE_EXCLUDE = '**/api/elements/built-in/*-API.mdx';

/**
 * Rejects normalized production routes that expose an API-only body partial.
 */
export function assertNoApiPartialRoutes(routes: Iterable<string>): void {
  const partialRoutes = [...routes].filter(isApiPartialRoute).sort();
  if (partialRoutes.length === 0) {
    return;
  }

  throw new Error(
    [
      'API-only built-in partials must not generate standalone routes:',
      ...partialRoutes.map((route) => `- ${route}`),
    ].join('\n'),
  );
}

/**
 * Identifies an English or one-segment localized built-in API partial route.
 */
export function isApiPartialRoute(route: string): boolean {
  const segments = route.split('/').filter(Boolean);
  if (segments.length < 4 || segments.length > 5) {
    return false;
  }

  const [api, elements, builtIn, page] = segments.slice(-4);
  return (
    api === 'api' &&
    elements === 'elements' &&
    builtIn === 'built-in' &&
    page.length > '-API'.length &&
    page.endsWith('-API')
  );
}
