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
        // Get the intersection of browsers in the `browsers` array and the
        // `PLATFORM_BROWSERS[platform]`.
        const browsersInPlatform = browsers.filter(
          (browser) => browserInfo[browser].type === platform,
        );
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

function BrowserHeaders({ browsers }: { browsers: BCD.PlatformName[] }) {
  return (
    <tr className="bc-browsers">
      <td />
      {browsers.map((browser) => {
        return (
          <th key={browser} className={`bc-browser bc-browser-${browser}`}>
            <div className={`bc-head-txt-label bc-head-icon-${browser}`}>
              <BrowserName id={browser} />
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
      <BrowserHeaders browsers={browsers} />
    </thead>
  );
}
