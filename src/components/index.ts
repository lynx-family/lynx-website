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
export type { CodeFoldProps } from './code-fold';
export { Columns } from './Columns';
export type { ColumnsProps } from './Columns';
export { BrowserContainer, FlexItem, ResponsiveDualColumn } from './containers';
export type {
  BrowserContainerProps,
  FlexItemProps,
  ResponsiveDualColumnProps,
} from './containers';
export { PlatformTabs } from './platform-tabs';
export type { PlatformTabProps, PlatformTabsProps } from './platform-tabs';
export { NextSteps } from './NextSteps';
export type { NextStepsProps, StepProps } from './NextSteps';
export { ChoiceTabs } from './choice-tabs';
export type { ChoiceTabProps, ChoiceTabsProps } from './choice-tabs';
export { TutorialTabs, LearnTutorialTabs } from './tutorial-tabs';
export type {
  TutorialTabItem,
  TutorialTabsProps,
  LearnTutorialTabsProps,
} from './tutorial-tabs';

// ----------------------------------------------------------------------------
// API Documentation (Tables, Badges)
// ----------------------------------------------------------------------------

export { APISummary } from './api-summary';
export type { APISummaryProps } from './api-summary';
export { APITableExplorer } from './api-table-explorer';
export { APITable } from './api-table';
export type { APITableProps } from './api-table';
export { PropertyDefinition } from './PropertyDefinition';
export type { PropertyDefinitionProps } from './PropertyDefinition';
export { VersionTable } from './VersionTable';
export type { VersionTableProps } from './VersionTable';

// API Badges
export { Badge } from '@rspress/core/theme';
export {
  APIBadge,
  PlatformBadge,
  RuntimeBadge,
  StatusBadge,
  VersionBadge,
} from './api-badge';
export type {
  APIBadgeProps,
  PlatformBadgeProps,
  RuntimeBadgeProps,
  StatusBadgeProps,
  VersionBadgeProps,
} from './api-badge';

// Platform Badges shorthand
export {
  AndroidOnly,
  ClayAndroidOnly,
  ClayHarmonyOSOnly,
  ClayIOSOnly,
  ClayMacOSOnly,
  ClayOnly,
  ClayWindowsOnly,
  HarmonyOnly,
  IOSOnly,
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
  NoWeb,
  WindowsOnly,
  WebOnly,
} from './api-badge';

// Status Badges shorthand
export { Deprecated, Experimental, Required } from './api-badge';

// ----------------------------------------------------------------------------
// Interactive & Examples
// ----------------------------------------------------------------------------

export { Go } from './go';
export type { GoProps } from './go';
export {
  VersionLink,
  VersionQRCode,
  versionResolver,
} from './version-resolver';
export type { VersionLinkProps, VersionQRCodeProps } from './version-resolver';

// ----------------------------------------------------------------------------
// Media & Visuals
// ----------------------------------------------------------------------------

export { Caption, Figure } from './Figure';
export type { CaptionProps, FigureProps } from './Figure';
export { EmbedIframe } from './EmbedIframe';
export type { EmbedIframeProps } from './EmbedIframe';
export { FoldableRenderFlow } from './foldable-render-flow';
export type { FoldableRenderFlowProps } from './foldable-render-flow';
export { HtmlViewer } from './html-viewer';
export type { HtmlViewerProps } from './html-viewer';
export { ImageWall } from './ImageWall';
export type { ImageWallItem, ImageWallProps } from './ImageWall';
export { InlineIcon } from './InlineIcon';
export type { InlineIconProps } from './InlineIcon';
export { Mermaid } from './Mermaid';
export type { MermaidProps } from './Mermaid';
export { VideoList } from './VideoList';
export { ThemedImage } from './ThemedImage';
export type { ThemedImageProps } from './ThemedImage';
export { YouTubeIframe } from './YoutubeIframe';

// ----------------------------------------------------------------------------
// Blog & Social
// ----------------------------------------------------------------------------

export { BlogAvatar } from './blog-avatar';
export type { BlogAvatarProps } from './blog-avatar';
export { BlogHeader } from './blog-header';
export { BlogList } from './blog-list';
export type { BlogListProps } from './blog-list';

// ----------------------------------------------------------------------------
// Utilities & Alerts
// ----------------------------------------------------------------------------

export { EditThis } from './EditThis';
export type { EditThisProps } from './EditThis';

// Callout (Note, Warning, Danger, Tip, Info)
export { Callout, Danger, Details, Info, Note, Tip, Warning } from './Callout';
