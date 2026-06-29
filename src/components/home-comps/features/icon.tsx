import React from 'react';
import { withBase } from '@rspress/core/runtime';
import { cn } from '@/lib/utils';
import { PlatformSvg } from '@/components/platform-navigation/PlatformIcon';
import {
  PLATFORM_TINT,
  type PlatformKey,
} from '@/components/platform-navigation/platform-colors';
import ReactLynxIcon from '@/components/api-table/compat-table/assets/icons/reactlynx.svg?react';
import VueLynxIcon from '@assets/home/vue-lynx-logo.svg?react';
import styles from './index.module.less';

const PlatformIconWrapper = ({ platform }: { platform: PlatformKey }) => (
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
