import React from 'react';
import styles from './index.module.less';

import Item0 from '@assets/home/home-f-0.svg';
import Item1 from '@assets/home/home-f-1.svg';
import Item2 from '@assets/home/home-f-2.svg';
import Item3 from '@assets/home/home-f-3.svg';
import Item4 from '@assets/home/home-f-4.svg';

import Item0Dark from '@assets/home/home-f-0-dark.svg';
import Item1Dark from '@assets/home/home-f-1-dark.svg';
import Item2Dark from '@assets/home/home-f-2-dark.svg';
import Item3Dark from '@assets/home/home-f-3-dark.svg';
import Item4Dark from '@assets/home/home-f-4-dark.svg';
import cls from 'classnames';
import { useFixDark } from '@site/theme/hooks/use-fix-dark';

const comps = {
  item0: {
    light: Item0,
    dark: Item0Dark,
  },
  item1: {
    light: Item1,
    dark: Item1Dark,
  },
  item2: {
    light: Item2,
    dark: Item2Dark,
  },
  item3: {
    light: Item3,
    dark: Item3Dark,
  },
  item4: {
    light: Item4,
    dark: Item4Dark,
  },
};

export const FeatureItem = ({ index }: { index: string }) => {
  const dark = useFixDark();

  return (
    <div className={cls(styles['feature-item-bg'])}>
      <img
        className={styles[index]}
        src={comps[index as keyof typeof comps][dark ? 'dark' : 'light']}
        alt=""
      />
    </div>
  );
};
