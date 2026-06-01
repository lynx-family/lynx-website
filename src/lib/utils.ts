import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import versionJson from '../../docs/public/version.json';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
