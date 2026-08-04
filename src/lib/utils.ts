import { withBase } from '@rspress/core/runtime';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const VERSION_PREFIX_RE = /^\/(?:next|\d+\.\d+)(?=\/|$)/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function withCurrentVersionBase(link: string) {
  const normalizedLink = link.startsWith('/') ? link : `/${link}`;

  if (VERSION_PREFIX_RE.test(normalizedLink)) {
    return normalizedLink;
  }

  return withBase(normalizedLink);
}

export function toLatestBlogPath(link?: string) {
  if (!link) {
    return withCurrentVersionBase('/blog/');
  }

  if (/^(https?:)?\/\//.test(link)) {
    return link;
  }

  return withCurrentVersionBase(link);
}

export function getLatestBlogIndexPath(lang: string) {
  return withCurrentVersionBase(lang === 'zh' ? '/zh/blog/' : '/blog/');
}
