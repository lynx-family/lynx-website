// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { APIBadge } from './APIBadge';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { VersionBadge } from './VersionBadge';

// Platform Badges shorthand
export {
  AndroidOnly,
  ClayAndroidOnly,
  ClayMacOSOnly,
  ClayOnly,
  ClayWindowsOnly,
  IOSOnly,
  NoAndroid,
  NoClay,
  NoClayAndroid,
  NoClayMacOS,
  NoClayWindows,
  NoIOS,
  NoWeb,
  WebOnly,
} from './PlatformBadge';
export { APIBadge, PlatformBadge, StatusBadge, VersionBadge };

// Status Badges shorthand
export { Deprecated, Experimental, Required } from './StatusBadge';
