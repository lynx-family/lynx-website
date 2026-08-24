/**
 * Resolve documentation routes from the docs site sources.
 *
 * `lynx_path` and the `doc_url` values derived from it are only useful if they
 * point at a page that actually exists. This module builds the set of routes
 * the docs site publishes, so generators can drop URLs that would 404 instead
 * of advertising them to consumers.
 *
 * The route set is derived from `docs/en` because `lynx_path` is en-rooted:
 * consumers prepend no locale segment (see the compat table's `withBase()`
 * call), so an en page is what a `lynx_path` resolves to.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Repository root, relative to `packages/lynx-compat-data/scripts/lib`.
 */
const repoRoot = path.join(dirname, '..', '..', '..', '..');

const docsDir = path.join(repoRoot, 'docs', 'en');

/**
 * Route prefixes that are excluded from the published site.
 *
 * Mirrors the `route.exclude` patterns in `rspress.config.ts`, minus the
 * `lynx-compat-data/**` entry (that is the symlinked data directory, which
 * lives outside `docs/en` and is never walked here). Keep in sync when the
 * rspress config changes: a file under one of these prefixes is not a route,
 * so a URL pointing at it would 404 like any other missing page.
 */
const EXCLUDED_ROUTE_PREFIXES = [
  'guide/start/fragments/',
  'guide/custom-native-component/',
  'guide/custom-native-modules/',
  'guide/embed-lynx-to-native/',
];

function isExcluded(route: string): boolean {
  return EXCLUDED_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
}

/**
 * Turn a documentation source path into the route it publishes at.
 *
 * `api/foo.mdx` -> `api/foo`, `api/foo/index.mdx` -> `api/foo`.
 */
function toRoute(relativePath: string): string {
  return relativePath
    .replace(/\.mdx?$/, '')
    .replace(/(^|\/)index$/, '')
    .replace(/\/$/, '');
}

function walk(dir: string, base: string, routes: Set<string>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, base, routes);
    } else if (/\.mdx?$/.test(entry.name)) {
      const route = toRoute(path.relative(base, entryPath));
      if (!isExcluded(route)) {
        routes.add(route);
      }
    }
  }
}

/**
 * Build the set of routes published by the docs site.
 *
 * Returns `null` when the docs sources are not available — the compat data
 * package can be consumed on its own, and in that case callers should fall
 * back to emitting URLs unchecked rather than dropping all of them.
 *
 * Note: Uses synchronous file system operations since this is called at script
 * startup, before any async work begins.
 */
export function loadDocRoutes(): Set<string> | null {
  if (!fs.existsSync(docsDir)) {
    return null;
  }
  const routes = new Set<string>();
  walk(docsDir, docsDir, routes);
  return routes;
}

/**
 * Check whether a documentation URL resolves to a published route.
 *
 * Accepts the shapes `lynx_path` and `doc_url` come in: with or without a
 * leading slash, with or without a `#fragment`. Fragments are ignored — only
 * the page is verified, since heading ids are not knowable from the source
 * path alone.
 */
export function isDocRoute(routes: Set<string>, url: string): boolean {
  const page = url.split('#')[0]!.replace(/^\//, '').replace(/\/$/, '');
  return routes.has(page);
}
