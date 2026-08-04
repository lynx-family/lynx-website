import { useEffect, useState } from 'react';
import { useLang } from '@rspress/core/runtime';
import { BLOG_BASE, BLOG_IS_CROSS_VERSION } from '@site/shared-route-config';
import { toLatestBlogPath } from '@site/src/lib/utils';
import {
  useLatestBlog,
  type LatestBlogConfig,
  type LatestBlogResult,
} from './use-latest-blog';

/**
 * The developing build's blog feed, which lists every published post. Served
 * from the same origin as every other version, so this is a plain fetch.
 */
const feedUrl = (lang: string) =>
  `${BLOG_BASE}/rss/blog-rss${lang === 'zh' ? '-zh' : ''}.xml`;

/**
 * First entry of an RSS feed, as `{ text, link }`.
 *
 * The feed carries a post's `title`, not its `badge_text`, so a badge fed
 * from here shows the full title. That is the deliberate trade: the
 * alternative is a build announcing a months-old release because its own
 * bundled content stops at the branch cut.
 *
 * `guid` is the site-relative route (`/blog/lynx-3-9`). `link` is absolute
 * and, because the feed's `siteUrl` carries no version prefix, points at an
 * unversioned path — so either form still has to be re-based.
 */
function parseFirstFeedEntry(
  xml: string,
): { text: string; link: string } | null {
  const item = new DOMParser()
    .parseFromString(xml, 'application/xml')
    .querySelector('item');
  const text = item?.querySelector('title')?.textContent?.trim();
  if (!text) return null;

  const guid = item?.querySelector('guid')?.textContent?.trim();
  const path = guid?.startsWith('/')
    ? guid
    : pathnameOf(item?.querySelector('link')?.textContent?.trim());
  if (!path) return null;

  return { text, link: toLatestBlogPath(path) };
}

function pathnameOf(href?: string) {
  if (!href) return undefined;
  try {
    return new URL(href).pathname;
  } catch {
    return undefined;
  }
}

/**
 * The latest blog post, read from the canonical blog rather than from this
 * build's own copy of it.
 *
 * Release builds are cut before a release post lands, and posts are never
 * backported, so their bundled page data is missing everything published
 * since the cut — {@link useLatestBlog} alone would announce a months-old
 * post. On the developing build there is nothing to cross-check and this is
 * exactly {@link useLatestBlog}.
 *
 * Falls back to the local result while the feed is in flight and if it can't
 * be read, so the caller always has something to render.
 */
export const useCanonicalLatestBlog = (
  config?: LatestBlogConfig,
): LatestBlogResult => {
  const local = useLatestBlog(config);
  const lang = useLang();
  const [canonical, setCanonical] = useState<LatestBlogResult | null>(null);

  // A pinned post or an external link is an explicit choice — leave it alone.
  const pinned = Boolean(config?.filename || config?.externalLink);
  const skip = !BLOG_IS_CROSS_VERSION || pinned;

  useEffect(() => {
    if (skip) return;

    const controller = new AbortController();

    fetch(feedUrl(lang), { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((xml) => {
        const entry = parseFirstFeedEntry(xml);
        if (entry) {
          setCanonical({
            blog: null,
            text: entry.text,
            link: entry.link,
            isExternal: false,
          });
        }
      })
      .catch(() => {
        // Aborted, offline, feed missing, or unparseable — keep the local result.
      });

    return () => controller.abort();
  }, [skip, lang]);

  // `link` is returned in the form its consumer needs: a base-relative route
  // for in-app navigation on the developing build, and a fully based path
  // when it points at another version and only a page load can get there.
  const fallback =
    BLOG_IS_CROSS_VERSION && !local.isExternal && local.link
      ? { ...local, link: toLatestBlogPath(local.link) }
      : local;

  return canonical ?? fallback;
};
