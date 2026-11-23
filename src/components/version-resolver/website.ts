import { createVersionResolver } from './core';
import type { WebsiteVersionData } from './registration';
import { websiteVersionRegistry } from './registry';

export type { WebsiteVersionData } from './registration';

/** Pure host adapter shared by the site and future build/editor consumers. */
export function createWebsiteVersionResolver(versionData: WebsiteVersionData) {
  return createVersionResolver({
    resources: websiteVersionRegistry.resources,
    bindings: websiteVersionRegistry.bindings(versionData),
  });
}
