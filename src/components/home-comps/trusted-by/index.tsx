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
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/49/3b/6a/493b6a1f-8aa5-8c88-6ebe-15a0bbfe7573/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/64x64bb.jpg',
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

const IconList: React.FC<{ offset?: number }> = ({ offset = 0 }) => (
  <div className={styles['icon-group']}>
    {apps.map((app) => (
      <div key={`${app.name}-${offset}`} className={styles['icon-item']}>
        <img
          className={styles['icon-img']}
          src={app.icon}
          alt={app.name}
          loading="lazy"
        />
      </div>
    ))}
  </div>
);

export const TrustedBy: React.FC = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className={styles['trusted-by']}>
      <p className={styles.heading}>{heading[lang]}</p>
      <div className={styles['marquee-outer']}>
        <div className={styles['marquee-wrapper']}>
          <div className={styles['marquee-track']}>
            <IconList offset={0} />
            <IconList offset={0} />
          </div>
        </div>
      </div>
    </div>
  );
};
