/**
 * Which subsite a route belongs to.
 *
 * The API reference is grouped by package rather than by subsite, so its
 * routes no longer carry the subsite in a path segment: `/api/packages/
 * react-signals` is ReactLynx, `/api/build/mode` is the Lynx guide. The
 * mapping below is the single place that decides this, for every version and
 * language form of a route.
 *
 * Runtime package metadata is shared with the Node-based documentation sync.
 */

import packageSubsites from './shared-api-package-subsites.json' with { type: 'json' };

/**
 * Packages of the API reference that belong to a subsite other than the Lynx
 * guide, by the name of their directory under `api/packages`. The manifest of
 * @lynx-js/lynx-stack-docs groups packages by what they are, not by subsite,
 * so this is stated here; the sync stops when a name is no longer a package
 * of the manifest, instead of letting its pages silently lose their theme.
 */
export const API_PACKAGE_SUBSITES: Record<string, string> = packageSubsites;

/**
 * Routes of the API reference that belong to a subsite as a whole, in matching
 * order. The testing library keeps the Lynx guide it had before the reference
 * moved under `/api/react`, next to the testing environment.
 */
const API_ROUTE_SUBSITES: [RegExp, string][] = [
  [/^\/api\/react\/testing-library(\/|$)/, 'guide'],
  [/^\/api\/react(\/|$)/, 'react'],
];

/**
 * The segment each subsite was published under before it was renamed. A route
 * that still carries the old name stays with its subsite, so the page keeps its
 * theme while a redirect to the current name is being processed.
 */
const LEGACY_SEGMENTS: Record<string, string> = {
  ui: 'lynx-ui',
};

/** A package page, which is the package itself or one of its members. */
const API_PACKAGE_ROUTE = /^\/api\/packages\/([^/]+)(?:\/|$)/;

/** The version a build is served under, as `version.json` spells it: `/next`, `/4.0`. */
const VERSION_PREFIX = /^\/(?:next|\d+(?:\.\d+)*)(?=\/|$)/;

function normalize(pathname: string): string {
  const route = pathname
    .replace(/\.html$/, '')
    .replace(VERSION_PREFIX, '')
    .replace(/^\/zh(?=\/|$)/, '')
    .replace(/\/$/, '');
  return route || '/';
}

/**
 * The subsite a route belongs to, or `undefined` when it belongs to none.
 *
 * @param subsites - Subsite values a path segment can name, in matching order.
 */
export function findSubsiteValue(
  pathname: string,
  subsites: readonly string[],
): string | undefined {
  const route = normalize(pathname);

  const apiRoute = API_ROUTE_SUBSITES.find(([pattern]) => pattern.test(route));
  if (apiRoute) {
    return apiRoute[1];
  }

  const page = API_PACKAGE_ROUTE.exec(route);
  if (page) {
    return API_PACKAGE_SUBSITES[page[1]];
  }

  const segments = route.split('/');
  return subsites.find((value) =>
    segments.some(
      (segment) => segment === value || segment === LEGACY_SEGMENTS[value],
    ),
  );
}
