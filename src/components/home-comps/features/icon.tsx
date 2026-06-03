import React from 'react';
import { withBase } from '@rspress/core/runtime';
import { cn } from '@/lib/utils';
import { PlatformSvg } from '@/components/platform-navigation/PlatformIcon';
import ReactLynxIcon from '@/components/api-table/compat-table/assets/icons/reactlynx.svg?react';
import VueLynxIcon from '@assets/home/vue-lynx-logo.svg?react';
import styles from './index.module.less';

// Each platform gets a brand-adjacent hue, kept at matching tonal weight
// (Tailwind ~600 in light mode, ~400 in dark) so the row stays harmonious.
const PLATFORM_TINT: Record<string, string> = {
  ios: 'text-zinc-700 dark:text-zinc-300',
  macos: 'text-zinc-700 dark:text-zinc-300',
  android: 'text-emerald-600 dark:text-emerald-400',
  harmony: 'text-rose-600 dark:text-rose-400',
  web: 'text-orange-600 dark:text-orange-400',
  windows: 'text-sky-600 dark:text-sky-400',
};

const PlatformIconWrapper = ({ platform }: { platform: string }) => (
  <PlatformSvg
    platformName={platform}
    className={cn(styles['platform-icon'], PLATFORM_TINT[platform])}
  />
);

const IconIOS = () => <PlatformIconWrapper platform="ios" />;
const IconAndroid = () => <PlatformIconWrapper platform="android" />;
const IconWeb = () => <PlatformIconWrapper platform="web" />;
const IconHarmony = () => <PlatformIconWrapper platform="harmony" />;
const IconMacOS = () => <PlatformIconWrapper platform="macos" />;
const IconWindows = () => <PlatformIconWrapper platform="windows" />;

const IconReactLynx = () => {
  return <ReactLynxIcon className={styles['reactlynx-icon']} />;
};

const IconVueLynx = () => {
  return <VueLynxIcon className={styles['vue-icon']} />;
};

const IconMisoLynx = () => {
  return (
    <img
      src={withBase('/assets/home/miso-lynx-logo.png')}
      alt=""
      className={styles['miso-icon']}
    />
  );
};

export {
  IconIOS,
  IconAndroid,
  IconWeb,
  IconHarmony,
  IconMacOS,
  IconWindows,
  IconReactLynx,
  IconVueLynx,
  IconMisoLynx,
};
