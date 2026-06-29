import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toLatestBlogPath(link?: string) {
  if (!link) {
    return '/next/blog/';
  }

  if (/^(https?:)?\/\//.test(link) || link.startsWith('/next/')) {
    return link;
  }

  return `/next${link.startsWith('/') ? link : `/${link}`}`;
}

export function getLatestBlogIndexPath(lang: string) {
  return lang === 'zh' ? '/next/zh/blog/' : '/next/blog/';
}
