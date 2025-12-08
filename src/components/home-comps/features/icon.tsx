import React from 'react';
import AndroidIcon from '@assets/home/home-icon-android.svg?react';
import WebIcon from '@assets/home/home-icon-web.svg?react';
import IosIcon from '@assets/home/home-icon-apple.svg?react';
import HarmonyIcon from '@assets/home/harmony.svg?react';
import styles from './index.module.less';

const IconAndroid = () => {
  return <AndroidIcon />;
};

const IconIOS = () => {
  return <IosIcon className={styles['ios-icon']} />;
};

const IconWeb = () => {
  return <WebIcon />;
};

const IconHarmony = () => {
  return <HarmonyIcon className={styles['harmony-icon']} />;
};

export { IconIOS, IconAndroid, IconWeb, IconHarmony };
