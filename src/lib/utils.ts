import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import versionJson from '../../docs/public/version.json';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currentVersionBase = `/${versionJson.current_version}`;
const versionPrefixPattern = /^\/(?:next|\d+\.\d+)(?:\/|$)/;

function withCurrentVersionBase(link: string) {
  if (/^(https?:)?\/\//.test(link) || versionPrefixPattern.test(link)) {
    return link;
  }

  return `${currentVersionBase}${link.startsWith('/') ? link : `/${link}`}`;
}

export function toLatestBlogPath(link?: string) {
  if (!link) {
    return withCurrentVersionBase('/blog/');
  }

  return withCurrentVersionBase(link);
}

export function getLatestBlogIndexPath(lang: string) {
  return withCurrentVersionBase(lang === 'zh' ? '/zh/blog/' : '/blog/');
}
