import { Badge, Tag } from '@rspress/core/theme';

/**
 * Renders a badge indicating that a feature is deprecated.
 *
 * Delegates to Rspress's built-in `Tag` so the badge picks up Rspress's
 * deprecated icon and stays in lockstep with the frontmatter
 * `tag: deprecated` rendering.
 * @example
 * <Deprecated />
 */
export function Deprecated() {
  return <Tag tag="deprecated" />;
}

/**
 * Renders a badge indicating that a feature is experimental.
 *
 * Delegates to Rspress's built-in `Tag` so the badge picks up the
 * Rspress experimental flask icon and stays in lockstep with the
 * frontmatter `tag: experimental` rendering.
 * @example
 * <Experimental />
 */
export function Experimental() {
  return <Tag tag="experimental" />;
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
