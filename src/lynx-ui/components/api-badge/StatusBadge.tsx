// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Badge } from '@rspress/core/theme-original';

/**
 * Renders a badge indicating that a feature is deprecated.
 * @param {Object} props - The component props.
 * @param {string} [props.since] - The version since which the feature was deprecated.
 * @returns {JSX.Element} A Badge component with "Deprecated" text.
 * @example
 * // Render a deprecated badge without version
 * <Deprecated />
 *
 * // Render a deprecated badge with version
 * <Deprecated since="2.0.0" />
 */
export function Deprecated({ since }: { since?: string }) {
  return (
    <Badge
      text={since ? `Deprecated in ${since}` : 'Deprecated'}
      type="danger"
    />
  );
}

/**
 * Renders a badge indicating that a feature is experimental.
 * @returns {JSX.Element} A Badge component with "Experimental" text.
 * @example
 * <Experimental />
 */
export function Experimental() {
  return <Badge text={'Experimental'} type="warning" />;
}

/**
 * Renders a badge indicating that a feature is required.
 * @returns {JSX.Element} A Badge component with "Required" text.
 * @example
 * <Required />
 */
export function Required() {
  return <Badge text={'Required'} type="info" />;
}

type StatusBadgeProps = {
  status: 'deprecated' | 'experimental' | 'required';
};

/**
 * Renders a status badge based on the provided status.
 * @param {StatusBadgeProps} props - The component props.
 * @param {('deprecated' | 'experimental' | 'required')} props.status - The status to display.
 * @returns {JSX.Element} A Badge component corresponding to the given status.
 * @example
 * <StatusBadge status="deprecated" />
 * <StatusBadge status="experimental" />
 * <StatusBadge status="required" />
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'deprecated':
      return <Deprecated />;
    case 'experimental':
      return <Experimental />;
    case 'required':
      return <Required />;
  }
}
