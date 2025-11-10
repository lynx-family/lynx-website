import { APIBadge } from './APIBadge';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { VersionBadge } from './VersionBadge';
import { RuntimeBadge } from './RuntimeBadge';

// Platform Badges shorthand
export {
  AndroidOnly,
  ClayAndroidOnly,
  ClayMacOSOnly,
  ClayOnly,
  ClayWindowsOnly,
  IOSOnly,
  HarmonyOnly,
  NoAndroid,
  NoClay,
  NoClayAndroid,
  NoClayMacOS,
  NoClayWindows,
  NoIOS,
  NoWeb,
  WebOnly,
} from './PlatformBadge';
export { APIBadge, PlatformBadge, StatusBadge, VersionBadge, RuntimeBadge };

// Status Badges shorthand
export { Deprecated, Experimental, Required } from './StatusBadge';
