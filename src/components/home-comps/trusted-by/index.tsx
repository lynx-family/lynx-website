import { useLang } from '@rspress/core/runtime';
import React from 'react';
import styles from './index.module.less';

interface Brand {
  name: string;
  color: string;
  darkColor?: string;
}

const brands: Brand[] = [
  { name: 'TikTok', color: '#010101', darkColor: '#ffffff' },
  { name: 'CapCut', color: '#000000', darkColor: '#ffffff' },
  { name: 'Lemon8', color: '#333333', darkColor: '#F5E642' },
  { name: 'Hypic', color: '#8B5CF6' },
  { name: 'Tokopedia', color: '#42B549' },
  { name: 'Gauth', color: '#FF6B35' },
  { name: 'Doubao', color: '#4F5BD5' },
];

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
        {brands.map((brand) => (
          <span
            key={brand.name}
            className={styles.wordmark}
            style={
              {
                '--brand-color': brand.color,
                '--brand-color-dark': brand.darkColor ?? brand.color,
              } as React.CSSProperties
            }
          >
            {brand.name}
          </span>
        ))}
      </div>
    </section>
  );
};
