import { cn } from '../../lib/utils';
import { PlatformIcon } from '../platform/PlatformIcon';
import type { PlatformIconGroupProps } from './types';
import styles from './PlatformIconGroup.module.scss';

// Legacy navigation IDs retain their existing presentation.
const toPlatformName = (platform: string): string => {
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

/** className targets the group; each glyph has its own size slot. */
export function PlatformIconGroup({
  platforms = [],
  className,
}: PlatformIconGroupProps) {
  if (!platforms.length) return null;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {platforms.map((platform) => (
        <PlatformIcon
          platformName={toPlatformName(platform)}
          key={platform}
          className={styles.icon}
        />
      ))}
    </div>
  );
}
