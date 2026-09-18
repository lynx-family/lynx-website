/**
 * Which subsite a route belongs to.
 *
 * The API reference is grouped by package rather than by subsite, so its
 * routes no longer carry the subsite in a path segment: `/api/packages/
 * react-signals` is ReactLynx, `/api/config/mode` is Rspeedy. The mapping
 * below is the single place that decides this, for every version and
 * language form of a route.
 *
 * Kept free of imports so `node --test` can run its tests.
 */

/** A package of the manifest of @lynx-js/lynx-stack-docs. */
export type ManifestPackage = {
  route: string;
  group: string;
};

/**
 * The subsite each group of the manifest belongs to. A group that names no
 * subsite leaves its packages to the segment match below.
 */
export const GROUP_SUBSITES: Record<string, string> = {
  'Build tools': 'rspeedy',
};

/**
 * Routes of the API reference that belong to a subsite as a whole, in matching
 * order. The testing library keeps the Lynx guide it had before the reference
 * moved under `/api/react`, next to the testing environment.
 */
const API_ROUTE_SUBSITES: [RegExp, string][] = [
  [/^\/api\/react\/testing-library(\/|$)/, 'guide'],
  [/^\/api\/config(\/|$)/, 'rspeedy'],
  [/^\/api\/react(\/|$)/, 'react'],
];

/** A package page, which is the package itself or one of its members. */
const API_PACKAGE_ROUTE = /^\/api\/packages\/([^/]+)(?:\/|$)/;

/**
 * The subsite of every package page, from the group the manifest puts the
 * package in. Every package has a page, whether the sidebar shows it or not.
 */
export function apiPackageSubsites(
  packages: readonly ManifestPackage[],
): Record<string, string> {
  const subsites: Record<string, string> = {};
  for (const { route, group } of packages) {
    const subsite = GROUP_SUBSITES[group];
    const name = route.startsWith('api/packages/')
      ? route.slice('api/packages/'.length)
      : undefined;
    if (subsite && name) subsites[name] = subsite;
  }
  return subsites;
}

export type SubsiteRouteOptions = {
  /** Subsite values a path segment can name, in matching order. */
  subsites: readonly string[];
  /** Subsite of each package page, from {@link apiPackageSubsites}. */
  packageSubsites?: Record<string, string>;
};

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

/** The subsite a route belongs to, or `undefined` when it belongs to none. */
export function findSubsiteValue(
  pathname: string,
  { subsites, packageSubsites = {} }: SubsiteRouteOptions,
): string | undefined {
  const route = normalize(pathname);

  const apiRoute = API_ROUTE_SUBSITES.find(([pattern]) => pattern.test(route));
  if (apiRoute) {
    return apiRoute[1];
  }

  const page = API_PACKAGE_ROUTE.exec(route);
  if (page) {
    return packageSubsites[page[1]];
  }

  const segments = route.split('/');
  return subsites.find((value) =>
    segments.some(
      (segment) =>
        segment === value || (value === 'ui' && segment === 'lynx-ui'),
    ),
  );
}
