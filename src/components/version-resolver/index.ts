import versionData from '@version-data';
import type { ComponentProps } from 'react';

import { createVersionComponents } from './components';
import { websiteVersionRegistry } from './registry';
import { createWebsiteVersionResolver } from './website';

export const versionResolver = createWebsiteVersionResolver(versionData);
export const { VersionLink, VersionQRCode } = createVersionComponents(
  versionResolver,
  websiteVersionRegistry.label,
);

export type VersionLinkProps = ComponentProps<typeof VersionLink>;
export type VersionQRCodeProps = ComponentProps<typeof VersionQRCode>;
