import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BLOG_BASE } from '@site/shared-route-config';

const VERSION_PREFIX_RE = /^\/(?:next|\d+\.\d+)(?=\/|$)/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Point a blog path at the canonical blog rather than at this build's own
 * copy of it. See {@link BLOG_BASE} for why the blog is not versioned
 * alongside the docs.
 */
function withBlogBase(link: string) {
  const normalizedLink = link.startsWith('/') ? link : `/${link}`;

  // Already carries a version prefix — respect the caller's choice.
  if (VERSION_PREFIX_RE.test(normalizedLink)) {
    return normalizedLink;
  }

  return `${BLOG_BASE}${normalizedLink}`;
}

export function toLatestBlogPath(link?: string) {
  if (!link) {
    return withBlogBase('/blog/');
  }

  if (/^(https?:)?\/\//.test(link)) {
    return link;
  }

  return withBlogBase(link);
}

export function getLatestBlogIndexPath(lang: string) {
  return withBlogBase(lang === 'zh' ? '/zh/blog/' : '/blog/');
}
