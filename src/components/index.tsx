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
export { default as APITable } from './api-table/APITable';

// BlogList
export { BlogList } from './blog-list';

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

export { ExamplePreview } from './go/example-preview';

export { BlogAvatar } from './blog-avatar';

// Version
export { VersionTable } from './VersionTable';
