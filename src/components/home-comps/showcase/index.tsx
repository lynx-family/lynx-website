import React from 'react';
import { useLang } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import styles from './index.module.less';
import { MobileShow } from './mobile-show';
import { TrustedBy } from '../trusted-by';

const showCaseList = [
  {
    title: {
      en: 'Two-Column Waterfall Gallery',
      zh: '瀑布流的产品双列',
    },
    desc: {
      en: 'Cover everything you need to know to start building with Lynx.',
      zh: '涵盖你开始使用 Lynx 所需了解的一切。',
    },
    class: 'case-0',
    link: {
      en: '/guide/start/tutorial-gallery',
      zh: '/zh/guide/start/tutorial-gallery',
    },
  },
  {
    title: {
      en: 'Product Detail with Carousel',
      zh: '轮播图的产品详情',
    },
    desc: {
      en: 'Deep dive into main thread scripting by building a highly responsive swiper.',
      zh: '通过打造轮播图深入了解主线程脚本。',
    },
    class: 'case-1',
    link: {
      en: '/guide/start/tutorial-product-detail',
      zh: '/zh/guide/start/tutorial-product-detail',
    },
  },
] as const;

const sectionTitle = {
  en: 'See Lynx in Action',
  zh: 'Lynx 实战',
} as const;

const sectionSubtitle = {
  en: 'Powering native experiences in the world\u2019s most popular apps',
  zh: '驱动全球最受欢迎 App 的原生体验',
} as const;

const tryTitle = {
  en: 'Now, try it yourself',
  zh: '现在，轮到你了',
} as const;

const trySubtitle = {
  en: 'Build real native UIs in minutes with our hands-on tutorials.',
  zh: '跟随教程，几分钟内打造真正的原生界面。',
} as const;

export const ShowCase: React.FC = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className={styles['show-case-frame']}>
      {/* Act 1: Credibility */}
      <div className={styles['section-title']}>
        {lang === 'en' ? (
          <>
            See <span className={styles['lynx-gradient']}>Lynx</span> in Action
          </>
        ) : (
          <>
            <span className={styles['lynx-gradient']}>Lynx</span> 实战
          </>
        )}
      </div>
      <p className={styles['section-subtitle']}>{sectionSubtitle[lang]}</p>
      <TrustedBy />

      {/* Divider between acts */}
      <div className={styles['section-divider']} />

      {/* Act 2: Invitation */}
      <div className={styles['try-section']}>
        <div className={styles['try-title']}>{tryTitle[lang]}</div>
        <p className={styles['try-subtitle']}>{trySubtitle[lang]}</p>
      </div>
      <ul className={styles['show-case-list']}>
        {showCaseList.map((item, index) => {
          return (
            <li className={styles['show-case-list-item']} key={index}>
              <MobileShow preview={item.class} />
              <div className={`${styles['item-title']} pb-2`}>
                {item.title[lang]}
              </div>
              <div className={`${styles['item-desc']} pb-2`}>
                {item.desc[lang]}
              </div>
              {!!item.link && (
                <Link href={item.link[lang]} className={styles['item-link']}>
                  {lang === 'zh'
                    ? '跟随教程编写 \u2192'
                    : 'Follow the tutorial \u2192'}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
