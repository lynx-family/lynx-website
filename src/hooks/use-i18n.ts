import { useI18n as useRspressI18n } from '@rspress/core/runtime';
import type { SiteI18nText } from './site-i18n';

/** Includes shared site translation keys alongside Rspress's built-in keys. */
export function useI18n() {
  return useRspressI18n<SiteI18nText>();
}
