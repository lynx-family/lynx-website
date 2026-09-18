import { SUBSITES_CONFIG } from '@site/shared-route-config';

import manifest from '@lynx-js/lynx-stack-docs/manifest.json';

import { apiPackageSubsites, findSubsiteValue } from '../shared-subsite-routes';

const PACKAGE_SUBSITES = apiPackageSubsites(manifest.shownPackages);
const SUBSITE_VALUES = SUBSITES_CONFIG.map((subsite) => subsite.value);

/** The subsite a route belongs to, defaulting to the Lynx guide. */
export const subsiteOf = (pathname: string) =>
  findSubsiteValue(pathname, {
    subsites: SUBSITE_VALUES,
    packageSubsites: PACKAGE_SUBSITES,
  }) ?? 'guide';
