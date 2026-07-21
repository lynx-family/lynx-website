import type LCD from '@lynx-js/lynx-compat-data';
import { getFullPlatformName } from '@lynx-js/lynx-compat-data';
import { Badge } from '@rspress/core/theme';

// TODO(xuan.huang): move this to a common place.
import { mapPlatformNameToIconName as mapPlatformNameToIconNameInHeaders } from '../api-table/compat-table/headers';
import { PlatformSvg } from '../platform-navigation/PlatformIcon';

import './PlatformBadge.css';

/**
 * Maps a platform name to its corresponding icon name.
 * @param platform The platform name to map.
 * @returns The icon name for the given platform.
 */
function mapPlatformNameToIconName(platform: ExtendedPlatformName) {
  if (platform === 'clay') {
    return 'clay';
  }
  if (platform === 'macos') {
    return 'macos-text';
  }
  if (platform === 'windows') {
    return 'windows';
  }
  return mapPlatformNameToIconNameInHeaders(platform);
}

// Extend LCD-defined platform names with labels that are useful in prose but
// are not compatibility-data platform keys.
type ExtendedPlatformName = LCD.PlatformName | 'clay' | 'macos' | 'windows';

/**
 * Technical, stable platform name. Used to derive the exported component keys
 * (`ClayOnly`, `NoHarmony`, etc.) so MDX imports stay valid no matter how the
 * user-facing label moves around.
 */
function mapPlatformNameToTechnicalName(platform: ExtendedPlatformName) {
  if (platform === 'clay') {
    return 'Clay';
  }
  if (platform === 'harmony') {
    return 'Harmony';
  }
  if (platform === 'macos') {
    return 'macOS';
  }
  if (platform === 'windows') {
    return 'Windows';
  }
  return getFullPlatformName(platform);
}

/**
 * User-facing label rendered inside the badge. Bare `clay` renders as
 * "Desktop" while the desktop branding is in flux. APIStatus and compat
 * tables keep the technical name; this only affects the badge chip.
 */
function mapPlatformNameToLabel(platform: ExtendedPlatformName) {
  if (platform === 'clay') {
    return 'Desktop';
  }
  return mapPlatformNameToTechnicalName(platform);
}

type BadgeProps = React.ComponentProps<typeof Badge>;

type PlatformBadgeInnerProps = {
  platform: ExtendedPlatformName;
  badgeText: string;
  type?: BadgeProps['type'];
};

// Maps the semantic `type` to a visual modifier class. The CSS in
// PlatformBadge.css decides what each modifier looks like: default keeps the
// platform color, `--only` emphasizes via a tinted ring, `--no` mutes the
// platform color and strikes the label so support/non-support don't read as
// the same chip in different words.
const TYPE_TO_MODIFIER: Record<NonNullable<BadgeProps['type']>, string> = {
  info: '',
  warning: 'platform-badge--only',
  danger: 'platform-badge--no',
  tip: '',
  note: '',
};

/**
 * Internal component for rendering a platform badge.
 * @internal
 */
function PlatformBadgeInner({
  platform,
  badgeText,
  type = 'info',
}: PlatformBadgeInnerProps) {
  const modifier = TYPE_TO_MODIFIER[type] ?? '';
  return (
    <span
      className={`platform-badge-${platform} ${modifier}`.trim()}
      style={{ display: 'contents' }}
    >
      <Badge type={type}>
        <PlatformSvg platformName={platform} className="platform-badge__icon" />
        <span className="platform-badge__label">{badgeText}</span>
      </Badge>
    </span>
  );
}

type PlatformBadgeProps = {
  platform: ExtendedPlatformName;
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
  const platformName = mapPlatformNameToLabel(platform);
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
  'macos',
  'windows',
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
        badgeText={mapPlatformNameToLabel(platform)}
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
        badgeText={`No ${mapPlatformNameToLabel(platform)}`}
        type="danger"
      />
    );
  };
}

// Generate components
const generatedComponents: Record<string, React.FC> = {};

for (const platform of platformNames) {
  // Component name derivation MUST use the technical name so `ClayOnly` and
  // `NoClay` exports stay valid even while the user-facing label says
  // "Desktop". Don't switch this to mapPlatformNameToLabel.
  const name = mapPlatformNameToTechnicalName(platform)
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
   * Renders a badge indicating macOS-only support
   * @example
   * <MacOSOnly />
   */
  MacOSOnly,
  /**
   * Renders a badge indicating no macOS support
   * @example
   * <NoMacOS />
   */
  NoMacOS,
  /**
   * Renders a badge indicating Windows-only support
   * @example
   * <WindowsOnly />
   */
  WindowsOnly,
  /**
   * Renders a badge indicating no Windows support
   * @example
   * <NoWindows />
   */
  NoWindows,
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
