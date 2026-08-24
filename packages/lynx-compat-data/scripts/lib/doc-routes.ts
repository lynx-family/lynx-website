/**
 * Resolve documentation routes from a docs source tree.
 *
 * `lynx_path`, and the `doc_url` values derived from it, are only useful if
 * they point at a page that actually exists. This module builds the set of
 * routes a docs tree publishes so generators can drop URLs that would 404
 * instead of advertising them to consumers.
 *
 * The docs root is always supplied by the caller. This package is consumed as
 * a generated-data input by more than one site, and those sites do not share a
 * docs tree or a checkout layout — resolving the root from this file's own
 * location would silently verify against whichever tree happened to sit next
 * to the installed package. Whoever runs the generator names their own docs
 * root, or opts out of verification entirely; nothing is inferred.
 *
 * Callers pass an en-language docs root, because `lynx_path` is en-rooted:
 * consumers prepend no locale segment (see the compat table's `withBase()`
 * call), so an en page is what a `lynx_path` resolves to.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Turn a docs-tree-relative source path into the route it publishes at.
 *
 * `api/foo.mdx` -> `api/foo`, `api/foo/index.mdx` -> `api/foo`.
 *
 * Accepts native separators — `path.relative()` yields backslashes on Windows,
 * while every route, `lynx_path` and `doc_url` uses `/`. Normalising here keeps
 * the generated data identical no matter which OS produced it.
 */
export function toRoute(relativePath: string): string {
  return relativePath
    .split(path.sep)
    .join('/')
    .replace(/\\/g, '/')
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
      routes.add(toRoute(path.relative(base, entryPath)));
    }
  }
}

/**
 * Build the set of routes published by a docs tree.
 *
 * Throws when `docsRoot` does not exist: a caller that asked for verification
 * and got none would otherwise write a differently shaped `api-stats.json`
 * depending on what happened to be on disk. Opting out is a decision the
 * caller makes by not passing a docs root at all.
 *
 * Route exclusions (rspress `route.exclude`) are deliberately not modelled
 * here. They are site config, they differ per consumer, and mirroring them
 * would put a second copy of another repository's routing semantics in this
 * package. The cost is that a page excluded from a build is still treated as
 * a route; today no `lynx_path` points into an excluded subtree.
 *
 * Note: Uses synchronous file system operations since this is called at script
 * startup, before any async work begins.
 */
export function loadDocRoutes(docsRoot: string): Set<string> {
  if (!fs.existsSync(docsRoot)) {
    throw new Error(
      `Docs root not found: ${docsRoot}\n` +
        'Pass a path to the docs sources to verify doc_url values against, ' +
        'or omit the option to skip verification.',
    );
  }
  const routes = new Set<string>();
  walk(docsRoot, docsRoot, routes);
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
