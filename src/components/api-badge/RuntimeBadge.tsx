import { Badge } from '@rspress/core/theme';

/**
 * Renders a badge indicating that a API only use for main thread.
 * @param {Object} props - The component props.
 * @returns {JSX.Element} A Badge component with "Main Thread Only" text.
 * @example
 * // Render a MTS badge
 * <MTS />
 *
 */
export function MTS() {
  return (
    <a href="/guide/spec.html#scripting-mts">
      <Badge text={'MTS Only'} />
    </a>
  );
}

/**
 * Renders a badge indicating that a feature is only use for background thread.
 * @returns {JSX.Element} A Badge component with "Background Thread Only" text.
 * @example
 * <BTS />
 */
export function BTS() {
  return (
    <a href="/guide/spec.html#scripting-bts">
      <Badge text={'BTS Only'} />
    </a>
  );
}

type RuntimeBadgeProps = {
  type: 'mts' | 'bts';
};

/**
 * Renders a status badge based on the provided status.
 * @param {RuntimeBadgeProps} props - The component props.
 * @param {('mts' | 'bts')} props.type - The type to display.
 * @returns {JSX.Element} A Badge component corresponding to the given type.
 * @example
 * <RuntimeBadgeProps type="mts" />
 * <RuntimeBadgeProps type="bts" />
 */
export function RuntimeBadge({ type }: RuntimeBadgeProps) {
  switch (type) {
    case 'mts':
      return <MTS />;
    case 'bts':
      return <BTS />;
  }
}
