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
import { BrowserName } from './browser-info';

function mapPlatformKindToIconName(platformType: BCD.PlatformType) {
  switch (platformType) {
    case 'native':
      return 'mobile';
    case 'clay':
      return 'clay';
    case 'web':
      return 'web';
    default:
      return platformType;
  }
}

export function mapPlatformNameToIconName(platformName: BCD.PlatformName) {
  switch (platformName) {
    case 'ios':
    case 'clay_macos':
    case 'clay_ios':
      return 'apple';
    case 'android':
    case 'clay_android':
      return 'android';
    case 'clay_windows':
      return 'windows';
    case 'web_lynx':
      return 'web';
    case 'harmony':
      return 'harmony';
    default:
      return platformName;
  }
}

function PlatformHeaders({
  platforms,
  browsers,
  browserInfo,
}: {
  platforms: string[];
  browsers: BCD.PlatformName[];
  browserInfo: BCD.Platforms;
}) {
  return (
    <tr className="bc-platforms">
      <td />
      {platforms.map((platform) => {
        const browsersInPlatform = browsers.filter((browser) => {
          if (process.env.COMPAT_TABLE_HIDE_CLAY) {
            if (
              platform === 'native' &&
              (browser === 'clay_macos' || browser === 'clay_windows')
            ) {
              return true;
            }
            return browserInfo[browser].type === platform;
          } else {
            if (browser.startsWith('clay_')) {
              return platform === 'clay';
            }
            return browserInfo[browser].type === platform;
          }
        });
        const browserCount = browsersInPlatform.length;
        return (
          <th
            key={platform}
            className={`bc-platform bc-platform-${platform}`}
            colSpan={browserCount}
            title={platform}
          >
            {/* <span
              className={`icon icon-${mapPlatformKindToIconName(platform)}`}
            /> */}
            <span>{platform}</span>
          </th>
        );
      })}
    </tr>
  );
}

function BrowserHeaders({
  browsers,
  browserInfo,
  platforms,
}: {
  browsers: BCD.PlatformName[];
  browserInfo: BCD.Platforms;
  platforms: string[];
}) {
  const getBrowserPlatformType = (browser: BCD.PlatformName): string => {
    if (process.env.COMPAT_TABLE_HIDE_CLAY) {
      if (browser === 'clay_macos' || browser === 'clay_windows') {
        return 'native';
      }
      return browserInfo[browser].type;
    } else {
      if (browser.startsWith('clay_')) {
        return 'clay';
      }
      return browserInfo[browser].type;
    }
  };

  return (
    <tr className="bc-browsers">
      <td />
      {browsers.map((browser) => {
        const platformType = getBrowserPlatformType(browser);
        return (
          <th key={browser} className={`bc-browser bc-browser-${browser}`}>
            <div className={`bc-head-txt-label bc-head-icon-${browser}`}>
              <BrowserName id={browser} platformType={platformType} />
            </div>
            <div
              className={`bc-head-icon-symbol icon icon-${mapPlatformNameToIconName(
                browser,
              )}`}
            ></div>
          </th>
        );
      })}
    </tr>
  );
}

export function browserToIconName(browser: string) {
  const browserStart = browser.split('_')[0];
  return browserStart === 'firefox' ? 'simple-firefox' : browserStart;
}

export function Headers({
  platforms,
  browsers,
  browserInfo,
}: {
  platforms: string[];
  browsers: BCD.PlatformName[];
  browserInfo: BCD.Platforms;
}) {
  return (
    <thead>
      <PlatformHeaders
        platforms={platforms}
        browsers={browsers}
        browserInfo={browserInfo}
      />
      <BrowserHeaders
        browsers={browsers}
        browserInfo={browserInfo}
        platforms={platforms}
      />
    </thead>
  );
}
