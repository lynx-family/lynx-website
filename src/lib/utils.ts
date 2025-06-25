import { type ClassValue, clsx } from 'clsx';
import { usePageData } from 'rspress/runtime';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useUrlWithBase(url: string) {
  const { siteData } = usePageData();
  if (siteData.base === '/' || !siteData.base) {
    return url;
  } else {
    return `${siteData.base}${url}`;
  }
}
