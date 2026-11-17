import { APIBadge } from './APIBadge';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { VersionBadge } from './VersionBadge';
import { RuntimeBadge } from './RuntimeBadge';

// Platform Badges shorthand
export {
  AndroidOnly,
  ClayAndroidOnly,
  ClayHarmonyOSOnly,
  ClayIOSOnly,
  ClayMacOSOnly,
  ClayOnly,
  ClayWindowsOnly,
  IOSOnly,
  HarmonyOnly,
  MacOSOnly,
  NoAndroid,
  NoClay,
  NoClayAndroid,
  NoClayHarmonyOS,
  NoClayIOS,
  NoClayMacOS,
  NoClayWindows,
  NoHarmony,
  NoIOS,
  NoMacOS,
  NoWindows,
  WindowsOnly,
  NoWeb,
  WebOnly,
} from './PlatformBadge';
export { APIBadge, PlatformBadge, StatusBadge, VersionBadge, RuntimeBadge };
export type { APIBadgeProps } from './APIBadge';
export type { PlatformBadgeProps } from './PlatformBadge';
export type { StatusBadgeProps } from './StatusBadge';
export type { VersionBadgeProps } from './VersionBadge';
export type { RuntimeBadgeProps } from './RuntimeBadge';

// Status Badges shorthand
export { Deprecated, Experimental, Required } from './StatusBadge';
