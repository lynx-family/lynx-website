import { useLang } from '@rspress/core/runtime';
import React from 'react';
import styles from './index.module.less';

const heading = {
  en: 'Trusted in production by',
  zh: '被广泛应用于生产环境',
};

const apps = [
  {
    name: 'TikTok',
    icon: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=64',
  },
  {
    name: 'CapCut',
    icon: 'https://www.google.com/s2/favicons?domain=capcut.com&sz=64',
  },
  {
    name: 'Hypic',
    icon: 'https://www.google.com/s2/favicons?domain=hypic.com&sz=64',
  },
  {
    name: 'Lemon8',
    icon: 'https://www.google.com/s2/favicons?domain=lemon8-app.com&sz=64',
  },
  {
    name: 'Doubao',
    icon: 'https://www.google.com/s2/favicons?domain=doubao.com&sz=64',
  },
  {
    name: 'Gauth',
    icon: 'https://www.google.com/s2/favicons?domain=gauthmath.com&sz=64',
  },
  {
    name: 'Tokopedia',
    icon: 'https://www.google.com/s2/favicons?domain=tokopedia.com&sz=64',
  },
];

const IconList: React.FC = () => (
  <div className={styles['icon-group']}>
    {apps.map((app) => (
      <div key={app.name} className={styles['icon-item']}>
        <img
          className={styles['icon-img']}
          src={app.icon}
          alt={app.name}
          loading="lazy"
        />
        <span className={styles['icon-label']}>{app.name}</span>
      </div>
    ))}
  </div>
);

export const TrustedBy: React.FC = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className={styles['trusted-by']}>
      <p className={styles.heading}>{heading[lang]}</p>
      <div className={styles['marquee-wrapper']}>
        <div className={styles['marquee-track']}>
          <IconList />
          <IconList />
        </div>
      </div>
    </div>
  );
};
