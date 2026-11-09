import type { CSSProperties } from 'react';
import { MaskIcon } from '../icons/MaskIcon';
import { mapPlatformIdToGlyphName } from './map-platform-id-to-glyph-name';

import apple from './assets/apple.svg';
import android from './assets/android.svg';
import harmony from './assets/harmony.svg';
import web from './assets/web.svg';
import windows from './assets/windows.svg';
import macos from './assets/macos-text.svg';
import clay from './assets/clay.svg';
import reactlynx from './assets/reactlynx.svg';
import lynxtron from './assets/lynxtron.svg';

/**
 * Private mask glyph registry keyed by renderer-owned glyph names.
 *
 * Keys identify glyph shapes, not compatibility platforms, host operating
 * systems, or workflow targets. Domain IDs are resolved before lookup, and
 * unknown runtime input deliberately falls back to the Clay glyph.
 */
const ICON_URLS = {
  apple,
  android,
  harmony,
  web,
  windows,
  'macos-text': macos,
  clay,
  reactlynx,
  lynxtron,
};

/**
 * Props for one decorative platform glyph.
 *
 * `platformName` is a domain-facing ID accepted by the platform glyph
 * resolver; it is not an asset filename. `className` and `style` target the
 * mask element, where callers provide `currentColor` and `--icon-size`.
 * Labels, grouping, support state, and interaction remain domain-owned.
 */
type PlatformIconProps = {
  platformName: string;
  className?: string;
  style?: CSSProperties;
};

/** One platform glyph. Labels, colors, grouping, and state belong to callers. */
export function PlatformIcon({
  platformName,
  className,
  style,
}: PlatformIconProps) {
  const iconName = mapPlatformIdToGlyphName(platformName);
  const src = Object.prototype.hasOwnProperty.call(ICON_URLS, iconName)
    ? ICON_URLS[iconName as keyof typeof ICON_URLS]
    : clay;
  return <MaskIcon src={src} className={className} style={style} />;
}
