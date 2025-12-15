/**
 * Doc Components
 *
 * Only components defined here are recommended to be used in the docs
 */

// CodeFold
export { CodeFold } from './code-fold';

// Containers
export { default as BrowserContainer } from './containers/BrowserContainer';
export {
  FlexItem,
  ResponsiveDualColumn,
} from './containers/ResponsiveDualColumn';

// APITable
export { default as APITableExplorer } from './api-table-explorer/APITableExplorer';
export { default as CompatTable } from './api-table/CompatTable';
export { default as SimpleAPITable } from './api-table/SimpleAPITable';

// API Badges
export { Badge } from '@rspress/core/theme';
export {
  APIBadge,
  PlatformBadge,
  RuntimeBadge,
  StatusBadge,
  VersionBadge,
} from './api-badge';
// Platform Badges shorthand
export {
  AndroidOnly,
  ClayAndroidOnly,
  ClayMacOSOnly,
  ClayOnly,
  ClayWindowsOnly,
  HarmonyOnly,
  IOSOnly,
  NoAndroid,
  NoClay,
  NoClayAndroid,
  NoClayMacOS,
  NoClayWindows,
  NoIOS,
  NoWeb,
  WebOnly,
} from './api-badge';
// Status Badges shorthand
export { Deprecated, Experimental, Required } from './api-badge';

export { VideoList } from './VideoList';

// Callout (Note, Warning, Danger, Tip, Info)
export {
  default as Callout,
  Danger,
  Details,
  Info,
  Note,
  Tip,
  Warning,
} from './Callout';

// EditThis
export { default as EditThis } from './EditThis';

export { Go } from './go/Go';

export { PlatformTabs } from './platform-tabs/PlatformTabs';

export { Columns } from './Columns';

export { default as Mermaid } from './Mermaid/Mermaid';

export { YouTubeIframe } from './YoutubeIframe';

// --------- Legacy ---------

export { default as LegacyCompatTable } from './LegacyCompatTable';

// AvailableBadge
export { default as AvailableBadge } from './available-badge/AvailableBadge';

// Reexport everything from VersionTag as top-level exports to help with migration
export {
  ClayUnavailable,
  Version14,
  Version15,
  Version16,
  Version20,
  Version21,
  Version210,
  Version211,
  Version212,
  Version213,
  Version214,
  Version215,
  Version216,
  Version217,
  Version218,
  Version22,
  Version23,
  Version24,
  Version25,
  Version25dot5,
  Version26,
  Version27,
  Version28,
  Version29,
  Version31,
  Version32,
} from './VersionTag';

export { ExamplePreview } from './go/example-preview';

export { BlogAvatar } from './blog-avatar';

// Version
export { VersionTable } from './VersionTable';
