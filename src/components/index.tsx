/**
 * @lynx/doc-components
 *
 * This module exports custom components used in the Lynx documentation.
 * These components are designed to enhance the documentation experience
 * with interactive examples, platform-specific content, and visual aids.
 */

// ----------------------------------------------------------------------------
// Layout & Containers
// ----------------------------------------------------------------------------

export { CodeFold } from './code-fold';
export { Columns } from './Columns';
export { default as BrowserContainer } from './containers/BrowserContainer';
export {
  FlexItem,
  ResponsiveDualColumn,
} from './containers/ResponsiveDualColumn';
export { PlatformTabs } from './platform-tabs/PlatformTabs';

// ----------------------------------------------------------------------------
// API Documentation (Tables, Badges)
// ----------------------------------------------------------------------------

export { default as APISummary } from './api-summary';
export { default as APITableExplorer } from './api-table-explorer/APITableExplorer';
export { default as APITable } from './api-table/APITable';
export { VersionTable } from './VersionTable';

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

// ----------------------------------------------------------------------------
// Interactive & Examples
// ----------------------------------------------------------------------------

export { Go } from './go/Go';

// ----------------------------------------------------------------------------
// Media & Visuals
// ----------------------------------------------------------------------------

export { default as Mermaid } from './Mermaid/Mermaid';
export { VideoList } from './VideoList';
export { YouTubeIframe } from './YoutubeIframe';

// ----------------------------------------------------------------------------
// Blog & Social
// ----------------------------------------------------------------------------

export { BlogAvatar } from './blog-avatar';
export { BlogList } from './blog-list';

// ----------------------------------------------------------------------------
// Utilities & Alerts
// ----------------------------------------------------------------------------

export { default as EditThis } from './EditThis';

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
