import { CORE_SUBSITES, SUBSITES_CONFIG } from '@site/shared-route-config';
import type { SubsiteConfig } from '@site/shared-route-config';

import manifest from '@lynx-js/lynx-stack-docs/manifest.json';

import { apiPackageSubsites, findSubsiteValue } from '../shared-subsite-routes';

const PACKAGE_SUBSITES = apiPackageSubsites(manifest.packages);
const SUBSITE_VALUES = SUBSITES_CONFIG.map((subsite) => subsite.value);

/** The subsite a route belongs to, defaulting to the Lynx guide. */
export const subsiteOf = (pathname: string) =>
  findSubsiteValue(pathname, {
    subsites: SUBSITE_VALUES,
    packageSubsites: PACKAGE_SUBSITES,
  }) ?? 'guide';

/** The subsite a route belongs to, as the navigation configures it. */
export const subsiteConfigOf = (pathname: string): SubsiteConfig => {
  const value = subsiteOf(pathname);
  return CORE_SUBSITES.find((s) => s.value === value) ?? CORE_SUBSITES[0];
};
