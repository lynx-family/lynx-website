import { CORE_SUBSITES, SUBSITES_CONFIG } from '@site/shared-route-config';
import type { SubsiteConfig } from '@site/shared-route-config';

import { findSubsiteValue } from '../shared-subsite-routes';

const SUBSITE_VALUES = SUBSITES_CONFIG.map((subsite) => subsite.value);

/** The subsite a route belongs to, defaulting to the Lynx guide. */
export const subsiteOf = (pathname: string) =>
  findSubsiteValue(pathname, SUBSITE_VALUES) ?? 'guide';

/** The subsite a route belongs to, as the navigation configures it. */
export const subsiteConfigOf = (pathname: string): SubsiteConfig => {
  const value = subsiteOf(pathname);
  return CORE_SUBSITES.find((s) => s.value === value) ?? CORE_SUBSITES[0];
};
