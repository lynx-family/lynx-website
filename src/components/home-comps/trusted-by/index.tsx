import { useLang } from '@rspress/core/runtime';
import { withBase } from '@rspress/core/runtime';
import React from 'react';
import styles from './index.module.less';

const heading = {
  en: 'Trusted by apps serving billions of users',
  zh: '亿级用户规模应用的共同选择',
};

export const TrustedBy: React.FC = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <section className={styles['trusted-by']}>
      <p className={styles.heading}>{heading[lang]}</p>
      <div className={styles.logos}>
        {/* TikTok wordmark — light SVG (white) for dark mode, dark SVG (black) for light mode */}
        <div className={styles['logo-item']}>
          <img
            src={withBase('/assets/home/tiktok-wordmark-black.svg')}
            alt="TikTok"
            className={`${styles['wordmark-img']} ${styles['light-only']}`}
            height={18}
          />
          <img
            src={withBase('/assets/home/tiktok-wordmark-white.svg')}
            alt="TikTok"
            className={`${styles['wordmark-img']} ${styles['dark-only']}`}
            height={18}
          />
        </div>
        {/* CapCut wordmark */}
        <div className={styles['logo-item']}>
          <img
            src={withBase('/assets/home/capcut-wordmark.svg')}
            alt="CapCut"
            className={`${styles['wordmark-img']} ${styles['light-only']}`}
            height={20}
          />
          <img
            src={withBase('/assets/home/capcut-wordmark.svg')}
            alt="CapCut"
            className={`${styles['wordmark-img']} ${styles['dark-only']} ${styles['invert']}`}
            height={20}
          />
        </div>
      </div>
    </section>
  );
};
