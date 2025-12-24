import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { cn } from '../../lib/utils';
import { mapPlatformNameToIconName } from '../api-table/compat-table/headers';
import { PlatformIconProps } from './types';
import './icon.scss';
import AndroidIcon from '@assets/home/home-icon-android.svg';
import WebIcon from '@assets/home/home-icon-web.svg';
import WindowsIcon from '@assets/home/windows.svg';
import IosIcon from '@assets/home/home-icon-apple.svg';
import HarmonyIcon from '@assets/home/harmony.svg';
import ClayIcon from '@assets/home/clay.svg';

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
  platformName: PlatformName | 'clay';
  className?: string;
  key?: string;
}) => {
  var svgUrl;
  if (platformName === 'clay') {
    svgUrl = ClayIcon;
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
