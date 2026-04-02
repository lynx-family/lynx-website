// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Badge } from '@rspress/core/theme-original';

/**
 * VersionBadge component displays a badge with a Lynx icon and version information.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {React.ReactNode} [props.children] - The content to display in the badge. If provided, it takes precedence over the `v` prop.
 * @param {number} [props.v] - The version number to display in the badge. Used if `children` is not provided.
 * @returns {JSX.Element} A badge element containing the Lynx icon and version information.
 *
 * @example
 * // Using the `v` prop
 * <VersionBadge v={2.5} />
 *
 * @example
 * // Using children
 * <VersionBadge>2.5.1</VersionBadge>
 */
export function VersionBadge({
  children,
  v,
}: {
  children?: React.ReactNode;
  v?: number;
}): JSX.Element {
  const content = children || v;

  return (
    <Badge>
      <div className={'icon icon-lynx bg-current w-[0.9rem] h-[0.9rem]'} />
      {content}
    </Badge>
  );
}
