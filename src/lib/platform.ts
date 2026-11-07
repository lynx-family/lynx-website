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
/**
 * Maps compatibility-data keys and site platform IDs to shared glyph names.
 * Unknown names pass through; the platform renderer owns the fallback asset.
 */
export function mapPlatformNameToIconName(platformName: string) {
  switch (platformName) {
    case 'ios':
    case 'clay_ios':
      return 'apple';
    case 'macos':
    case 'macos-arm64':
    case 'macos-intel':
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
