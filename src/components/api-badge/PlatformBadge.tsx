import type LCD from '@lynx-js/lynx-compat-data';
import { getFullPlatformName, PlatformName } from '@lynx-js/lynx-compat-data';
import { Badge } from '@rspress/core/theme';

// TODO(xuan.huang): move this to a common place.
import { mapPlatformNameToIconName as mapPlatformNameToIconNameInHeaders } from '../api-table/compat-table/headers';
import { PlatformSvg } from '../platform-navigation/PlatformIcon';

/**
 * Maps a platform name to its corresponding icon name.
 * @param platform The platform name to map.
 * @returns The icon name for the given platform.
 */
function mapPlatformNameToIconName(platform: ExtendedPlatformName) {
  if (platform === 'clay') {
    return 'clay';
  }
  return mapPlatformNameToIconNameInHeaders(platform);
}

// Extend LCD-defined platform names to include 'clay' as a shorthand for Clay as a whole.
type ExtendedPlatformName = LCD.PlatformName | 'clay';

/**
 * Maps a platform name to its full name.
 * @param platform The platform name to map.
 * @returns The full name of the given platform.
 */
function mapPlatformNameToFullName(platform: ExtendedPlatformName) {
  if (platform === 'clay') {
    return 'Clay';
  }
  if (platform === 'harmony') {
    return 'Harmony';
  }
  return getFullPlatformName(platform);
}

type BadgeProps = React.ComponentProps<typeof Badge>;

type PlatformBadgeInnerProps = {
  platform: PlatformName;
  badgeText: string;
  type?: BadgeProps['type'];
};

/**
 * Internal component for rendering a platform badge.
 * @param props The properties for the PlatformBadgeInner component.
 * @returns A Badge component with platform-specific styling.
 * @internal
 */
function PlatformBadgeInner({
  platform,
  badgeText,
  type = 'info',
}: PlatformBadgeInnerProps) {
  return (
    <Badge type={type}>
      <PlatformSvg
        platformName={platform}
        className={`bg-current w-[0.9rem] h-[0.9rem]`}
      />
      {badgeText}
    </Badge>
  );
}

type PlatformBadgeProps = {
  platform: PlatformName;
  version?: LCD.VersionValue;
  type?: BadgeProps['type'];
};

/**
 * Renders a badge for a specific platform, optionally including version information.
 * @param props The properties for the PlatformBadge component.
 * @returns A PlatformBadgeInner component with the appropriate text and styling.
 * @example
 * // Render a badge for Android
 * <PlatformBadge platform="android" />
 *
 * // Render a badge for iOS with version
 * <PlatformBadge platform="ios" version="14.0" />
 */
export function PlatformBadge({
  platform,
  version,
  type = 'info',
}: PlatformBadgeProps) {
  const platformName = mapPlatformNameToFullName(platform);
  const badgeText = version ? `${platformName} ${version}+` : platformName;

  return (
    <PlatformBadgeInner platform={platform} badgeText={badgeText} type={type} />
  );
}

// Generate dynamic [Platform]Only and No[Platform] components
const platformNames: ExtendedPlatformName[] = [
  'android',
  'ios',
  'harmony',
  'clay_android',
  'clay_ios',
  'clay_macos',
  'clay_windows',
  'web_lynx',
  'clay',
];

/**
 * Creates a component that renders a badge indicating the platform is the only supported one.
 * @param platform The platform to create the component for.
 * @returns A React functional component.
 */
function createPlatformOnlyComponent(platform: ExtendedPlatformName) {
  return function PlatformOnly() {
    return (
      <PlatformBadgeInner
        platform={platform}
        badgeText={`${mapPlatformNameToFullName(platform)} only`}
        type="warning"
      />
    );
  };
}

/**
 * Creates a component that renders a badge indicating the platform is not supported.
 * @param platform The platform to create the component for.
 * @returns A React functional component.
 */
function createNoPlatformComponent(platform: ExtendedPlatformName) {
  return function NoPlatform() {
    return (
      <PlatformBadgeInner
        platform={platform}
        badgeText={`no ${mapPlatformNameToFullName(platform)}`}
        type="danger"
      />
    );
  };
}

// Generate components
const generatedComponents: Record<string, React.FC> = {};

for (const platform of platformNames) {
  const name = mapPlatformNameToFullName(platform)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const componentNameOnly = `${name}Only`;
  const componentNameNo = `No${name}`;

  const PlatformOnly = createPlatformOnlyComponent(platform);
  const NoPlatform = createNoPlatformComponent(platform);

  // Assign to generatedComponents object with the correct names
  generatedComponents[componentNameOnly] = PlatformOnly;
  generatedComponents[componentNameNo] = NoPlatform;

  // Set the display names for React DevTools
  // @ts-ignore
  PlatformOnly.displayName = componentNameOnly;
  // @ts-ignore
  NoPlatform.displayName = componentNameNo;
}

// Although we can dynamically generate components, we have to explicitly list all exports
// for static analysis tools and better IDE support.
export const {
  /**
   * Renders a badge indicating Android-only support
   * @example
   * <AndroidOnly />
   */
  AndroidOnly,
  /**
   * Renders a badge indicating no Android support
   * @example
   * <NoAndroid />
   */
  NoAndroid,
  /**
   * Renders a badge indicating iOS-only support
   * @example
   * <IOSOnly />
   */
  IOSOnly,
  /**
   * Renders a badge indicating Harmony-only support
   * @example
   * <HarmonyOnly />
   */
  HarmonyOnly,
  /**
   * Renders a badge indicating no iOS support
   * @example
   * <NoIOS />
   */
  NoIOS,
  /**
   * Renders a badge indicating Clay Android-only support
   * @example
   * <ClayAndroidOnly />
   */
  ClayAndroidOnly,
  /**
   * Renders a badge indicating no Clay Android support
   * @example
   * <NoClayAndroid />
   */
  NoClayAndroid,
  /**
   * Renders a badge indicating Clay macOS-only support
   * @example
   * <ClayMacOSOnly />
   */
  ClayMacOSOnly,
  /**
   * Renders a badge indicating no Clay macOS support
   * @example
   * <NoClayMacOS />
   */
  NoClayMacOS,
  /**
   * Renders a badge indicating Clay Windows-only support
   * @example
   * <ClayWindowsOnly />
   */
  ClayWindowsOnly,
  /**
   * Renders a badge indicating no Clay Windows support
   * @example
   * <NoClayWindows />
   */
  NoClayWindows,
  /**
   * Renders a badge indicating Web-only support
   * @example
   * <WebOnly />
   */
  WebOnly,
  /**
   * Renders a badge indicating no Web support
   * @example
   * <NoWeb />
   */
  NoWeb,
  /**
   * Renders a badge indicating Clay-only support
   * @example
   * <ClayOnly />
   */
  ClayOnly,
  /**
   * Renders a badge indicating no Clay support
   * @example
   * <NoClay />
   */
  NoClay,
} = generatedComponents;
