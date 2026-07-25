import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { withBase } from '@rspress/core/runtime';
import { cn } from '../../lib/utils';
import { mapPlatformNameToIconName } from '../api-table/compat-table/headers';
import { PlatformIconProps } from './types';
import './icon.scss';

// Single canonical icon source for every platform-icon surface on the site.
// Adding a new platform = add an SVG here, extend ICON_NAME_TO_URL, done.
import AppleIcon from '@/components/api-table/compat-table/assets/icons/apple.svg';
import AndroidIcon from '@/components/api-table/compat-table/assets/icons/android.svg';
import HarmonyIcon from '@/components/api-table/compat-table/assets/icons/harmony.svg';
import WebIcon from '@/components/api-table/compat-table/assets/icons/web.svg';
import WindowsIcon from '@/components/api-table/compat-table/assets/icons/windows.svg';
import MacosIcon from '@/components/api-table/compat-table/assets/icons/macos-text.svg';
import ClayIcon from '@/components/api-table/compat-table/assets/icons/clay.svg';
import ReactlynxIcon from '@/components/api-table/compat-table/assets/icons/reactlynx.svg';

const LynxtronIcon = withBase('/assets/lynxtron/lynxtron-icon-light.svg');

const ICON_NAME_TO_URL: Record<string, string> = {
  apple: AppleIcon,
  android: AndroidIcon,
  harmony: HarmonyIcon,
  web: WebIcon,
  windows: WindowsIcon,
  'macos-text': MacosIcon,
  clay: ClayIcon,
  reactlynx: ReactlynxIcon,
  lynxtron: LynxtronIcon,
};

const toIconUrl = (platformName: PlatformName | string): string => {
  // Extra string ids used by tabs/badges that aren't in BCD.PlatformName.
  if (platformName === 'clay') return ClayIcon;
  if (
    platformName === 'macos' ||
    platformName === 'macos-arm64' ||
    platformName === 'macos-intel'
  ) {
    return MacosIcon;
  }
  if (platformName === 'web') return WebIcon;
  if (platformName === 'windows') return WindowsIcon;
  if (platformName === 'lynxtron') return ICON_NAME_TO_URL.lynxtron;

  // BCD-known platform names route through compat-table's mapping so we stay
  // consistent with the APITable headers (clay_macos → macos-text etc.).
  const iconName = mapPlatformNameToIconName(platformName as PlatformName);
  return ICON_NAME_TO_URL[iconName] ?? ClayIcon;
};

export const PlatformSvg = ({
  platformName,
  className,
  key,
  style,
}: {
  platformName: PlatformName | string;
  className?: string;
  key?: string;
  style?: React.CSSProperties;
}) => {
  const svgUrl = toIconUrl(platformName);
  return (
    <div
      className={cn('icon', className)}
      key={key}
      style={{
        maskImage: `url(${svgUrl})`,
        WebkitMaskImage: `url(${svgUrl})`,
        ...style,
      }}
    />
  );
};

const toPlatformName = (platform: string): PlatformName | string => {
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
    case 'lynxtron':
      return 'lynxtron';
    case 'pc':
      return 'windows';
    default:
      return 'web_lynx';
  }
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
