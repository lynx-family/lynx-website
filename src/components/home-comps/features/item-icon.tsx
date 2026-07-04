import React from 'react';
import styles from './index.module.less';

import IconReact from '@assets/home/home-f-icon-1.svg?react';
import ItemPerformance from '@assets/home/home-f-icon-0.svg?react';
import ItemEcosystem from '@assets/home/home-f-icon-2.svg?react';
import ItemBatteries from '@assets/home/home-f-icon-4.svg?react';
import ItemConfig from '@assets/home/home-f-icon-5.svg?react';

import IconReactDark from '@assets/home/home-f-icon-1-dark.svg?react';
import ItemPerformanceDark from '@assets/home/home-f-icon-0-dark.svg?react';
import ItemEcosystemDark from '@assets/home/home-f-icon-2-dark.svg?react';
import { useFixDark } from '@site/theme/hooks/use-fix-dark';

const comps = {
  react: {
    light: <IconReact />,
    dark: <IconReactDark />,
  },
  performance: {
    light: <ItemPerformance />,
    dark: <ItemPerformanceDark />,
  },
  ecosystem: {
    light: <ItemEcosystem />,
    dark: <ItemEcosystemDark />,
  },
  batteries: {
    light: <ItemBatteries />,
    dark: <ItemBatteries />,
  },
  config: {
    light: <ItemConfig />,
    dark: <ItemConfig />,
  },
  rstack: {
    light: <span />,
    dark: <span />,
  },
};

export const FeatureIconItem = ({ index }: { index: string }) => {
  const dark = useFixDark();

  return (
    <div className={styles['title-icon']}>
      {comps[index as keyof typeof comps][dark ? 'dark' : 'light']}
    </div>
  );
};
