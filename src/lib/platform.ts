/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *   Original source from MDN Yari:
 *   https://github.com/mdn/yari/tree/main/client/src/document/ingredients/browser-compatibility-table
 *   Copyright Mozilla Contributors
 *   Licensed under the Mozilla Public License, v. 2.0
 */
import type BCD from '@lynx-js/lynx-compat-data';

/**
 * Maps a BCD platform name to the icon name used by the shared icon set
 * (see `PlatformSvg`'s `ICON_NAME_TO_URL`). Shared across the compat-table
 * headers, platform badges, and platform-navigation icons so every surface
 * derives the same icon for a given platform.
 */
export function mapPlatformNameToIconName(platformName: BCD.PlatformName) {
  switch (platformName) {
    case 'ios':
    case 'clay_ios':
      return 'apple';
    case 'clay_macos':
      return 'macos-text';
    case 'android':
    case 'clay_android':
      return 'android';
    case 'clay_windows':
      return 'windows';
    case 'web_lynx':
      return 'web';
    case 'harmony':
    case 'clay_harmony':
      return 'harmony';
    default:
      return platformName;
  }
}
