import RspeedyMigrationNotice from './RspeedyMigrationNotice';

/**
 * Shared HTML content for Layout.beforeDocContent, exported by theme/index.tsx.
 * Add shared notices here; this component owns their order, while each notice
 * owns its visibility conditions.
 *
 * Layout uses this aggregate when the slot is omitted or undefined. A supplied
 * React node replaces the entire slot; null disables it. Consumers should
 * compose this public export rather than list individual notice components.
 * Keep default values through wrapper layers to preserve caller overrides.
 *
 * Rspress skips document slots when exporting Markdown. Required document
 * metadata needs a separate Markdown output path, independent of this HTML slot.
 *
 * @example With the OSS theme mounted at ./oss:
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import {
 *   BeforeDocContent as OssBeforeDocContent,
 *   Layout as OssLayout,
 * } from './oss';
 * import DocumentIndicator from './DocumentIndicator';
 *
 * function ConsumerBeforeDocContent() {
 *   return (
 *     <>
 *       <DocumentIndicator />
 *       <OssBeforeDocContent />
 *     </>
 *   );
 * }
 *
 * export function Layout({
 *   beforeDocContent = <ConsumerBeforeDocContent />,
 *   ...props
 * }: ComponentProps<typeof OssLayout>) {
 *   return <OssLayout {...props} beforeDocContent={beforeDocContent} />;
 * }
 * ```
 */
export default function BeforeDocContent() {
  return <RspeedyMigrationNotice />;
}
