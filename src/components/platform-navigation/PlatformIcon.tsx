import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { cn } from '../../lib/utils';
import { mapPlatformNameToIconName } from '../api-table/compat-table/headers';
import { PlatformIconProps } from './types';
import './icon.scss';
import AndroidIcon from '@assets/home/home-icon-android.svg';
import WindowsIcon from '@assets/home/windows.svg';
import IosIcon from '@assets/home/home-icon-apple.svg';
import HarmonyIcon from '@assets/home/harmony.svg';
import ClayIcon from '@assets/home/clay.svg';
// Use the same HTML5 web icon and macOS text mark as the homepage features
// section so platform indicators stay consistent across the site.
import WebIcon from '@/components/api-table/compat-table/assets/icons/web.svg';
import MacosIcon from '@/components/api-table/compat-table/assets/icons/macos-text.svg';

const toPlatformName = (platform: string): PlatformName => {
  switch (platform) {
    case 'ios':
    case 'ios-simulator':
    case 'macos':
    case 'macos-arm64':
    case 'macos-intel':
      return 'ios';
    case 'android':
      return 'android';
    case 'web':
      return 'web_lynx';
    default:
      return 'web_lynx';
  }
};

export const PlatformSvg = ({
  platformName,
  className,
  key,
}: {
  // Accept extra string ids ('clay', 'macos', 'macos-arm64', 'macos-intel',
  // 'windows') alongside the canonical PlatformName so PlatformTabs and
  // ChoiceTabs can use the homepage-aligned icon set without TS friction.
  platformName: PlatformName | string;
  className?: string;
  key?: string;
}) => {
  var svgUrl;
  if (platformName === 'clay') {
    svgUrl = ClayIcon;
  } else if (
    platformName === 'macos' ||
    platformName === 'macos-arm64' ||
    platformName === 'macos-intel' ||
    platformName === 'clay_macos'
  ) {
    // Use the dedicated "macOS" text mark so macOS is visually distinct from
    // iOS (which both share the Apple glyph).
    svgUrl = MacosIcon;
  } else {
    switch (mapPlatformNameToIconName(platformName)) {
      case 'android':
        svgUrl = AndroidIcon;
        break;
      case 'apple':
        svgUrl = IosIcon;
        break;
      case 'harmony':
        svgUrl = HarmonyIcon;
        break;
      case 'windows':
        svgUrl = WindowsIcon;
        break;
      case 'web':
        svgUrl = WebIcon;
        break;
      default:
        svgUrl = ClayIcon;
    }
  }
  return (
    <div
      className={cn('icon', className)}
      key={key}
      style={{
        maskImage: `url(${svgUrl})`,
        WebkitMaskImage: `url(${svgUrl})`,
      }}
    ></div>
  );
};

/**
 * Component for rendering platform icons
 */
export const PlatformIcon = ({
  platforms = [],
  className,
}: PlatformIconProps) => {
  if (!platforms.length) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {platforms.map((platform) => {
        return (
          <PlatformSvg
            platformName={toPlatformName(platform)}
            key={platform}
            className={`icon bg-current h-8 w-8`}
          />
        );
      })}
    </div>
  );
};
