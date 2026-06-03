import React from 'react';
import { withBase } from '@rspress/core/runtime';
import AndroidIcon from '@assets/home/home-icon-android.svg?react';
import WebIcon from '@/components/api-table/compat-table/assets/icons/web.svg?react';
import AppleIcon from '@assets/home/home-icon-apple.svg?react';
import HarmonyIcon from '@assets/home/harmony.svg?react';
import MacOSIcon from '@/components/api-table/compat-table/assets/icons/macos-text.svg?react';
import WindowsIcon from '@assets/home/windows.svg?react';
import ReactLynxIcon from '@/components/api-table/compat-table/assets/icons/reactlynx.svg?react';
import VueLynxIcon from '@assets/home/vue-lynx-logo.svg?react';
import styles from './index.module.less';

const IconAndroid = () => {
  return <AndroidIcon />;
};

const IconIOS = () => {
  return <AppleIcon className={styles['ios-icon']} />;
};

const IconWeb = () => {
  return <WebIcon className={styles['web-icon']} />;
};

const IconHarmony = () => {
  return <HarmonyIcon className={styles['harmony-icon']} />;
};

const IconMacOS = () => {
  return <MacOSIcon className={styles['macos-icon']} />;
};

const IconWindows = () => {
  return <WindowsIcon className={styles['windows-icon']} />;
};

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
