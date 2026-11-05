import type { CSSProperties } from 'react';
import { withBase } from '@rspress/core/runtime';
import { mapPlatformNameToIconName } from '../../lib/platform';
import { MaskIcon } from '../icons/MaskIcon';

import apple from './assets/apple.svg';
import android from './assets/android.svg';
import harmony from './assets/harmony.svg';
import web from './assets/web.svg';
import windows from './assets/windows.svg';
import macos from './assets/macos-text.svg';
import clay from './assets/clay.svg';
import reactlynx from './assets/reactlynx.svg';

const ICON_URLS = {
  apple,
  android,
  harmony,
  web,
  windows,
  'macos-text': macos,
  clay,
  reactlynx,
};

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
  const iconName = mapPlatformNameToIconName(platformName);
  const src =
    iconName === 'lynxtron'
      ? withBase('/assets/lynxtron/lynxtron-icon-light.svg')
      : Object.prototype.hasOwnProperty.call(ICON_URLS, iconName)
        ? ICON_URLS[iconName as keyof typeof ICON_URLS]
        : clay;
  return <MaskIcon src={src} className={className} style={style} />;
}
