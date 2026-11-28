import React from 'react';
import { withBase } from '@rspress/core/runtime';
import { cn } from '@/lib/utils';
import { PlatformIcon } from '../../platform/PlatformIcon';
import {
  PLATFORM_TINT,
  type PlatformKey,
} from '../../platform/platform-colors';
import ReactLynxIcon from '../../platform/assets/reactlynx.svg?react';
import VueLynxIcon from './vue-lynx-logo.svg?react';
import OctaneIcon from './octane-logo.svg?react';
import styles from './index.module.less';

const PlatformIconWrapper = ({ platform }: { platform: PlatformKey }) => (
  <PlatformIcon
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

const IconAngularLynx = () => {
  return (
    <img
      src={withBase('/assets/home/angularlynx-logo.png')}
      alt=""
      className={styles['angular-icon']}
    />
  );
};

const IconOctaneLynx = () => {
  return <OctaneIcon className={styles['octane-icon']} />;
};

const IconMisoLynx = () => {
  return (
    <img
      src={withBase('/assets/home/miso-mark-gradient.svg')}
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
  IconAngularLynx,
  IconOctaneLynx,
  IconMisoLynx,
};
