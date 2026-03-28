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

const sectionSubtitle = {
  en: 'Powering native experiences in the world\u2019s most popular apps',
  zh: '驱动全球最受欢迎 App 的原生体验',
} as const;

/**
 * TikTok Primary Logo – inline SVG with trimmed viewBox to remove built-in padding.
 * `textFill` controls the wordmark color; the note/flame colours are fixed brand colours.
 */
const TikTokLogo: React.FC<{ textFill: string; className?: string }> = ({
  textFill,
  className,
}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="130 135 1160 300"
    aria-label="TikTok"
    role="img"
  >
    <path
      fill="#2dccd3"
      d="m937.78,349c0-42.73,31.51-76.25,73.98-79.41-2.18-.16-4.38-.25-6.6-.25-45.76,0-80.57,34.75-80.57,79.65s34.81,79.68,80.57,79.68c2.22,0,4.42-.09,6.6-.25-42.46-3.16-73.98-36.7-73.98-79.43ZM398.47,218.44v-8.92c-13.62-.96-27.88-5.24-40.42-13.49,11.54,11.88,25.92,19.11,40.42,22.41Zm-123.76-81.22v199.41c0,26.13-18.81,42.93-41.68,42.93-7.59,0-14.79-1.77-21.05-5.04,7.95,10.13,20.49,15.95,34.25,15.95,22.87,0,41.68-16.8,41.68-42.95v-199.41h36.25c-.99-3.47-1.8-7.1-2.42-10.89h-47.02Zm-29.74,115.93v-9.88c-4.58-.76-9.16-1.01-12.95-1.01-51.6,0-94.8,41.34-94.8,92.6,0,33.65,16.41,62.42,41.34,79.45-17.37-17.21-28.14-41.29-28.14-68.56,0-51.18,43.07-92.49,94.56-92.6Z"
    />
    <path
      fill="#f1204a"
      d="m1031.55,269.35c-2.22,0-4.42.09-6.6.25,42.44,3.16,73.95,36.7,73.95,79.41s-31.51,76.27-73.95,79.43c2.18.16,4.38.25,6.6.25,45.74,0,80.55-34.77,80.55-79.68s-34.81-79.65-80.55-79.65Zm-673.51-73.31c-11.15-11.45-19.66-27.22-23.12-47.93h-10.77c6.15,22.38,18.81,38,33.89,47.93Zm40.42,60.16c-20.94,0-40.76-3.99-58.22-15.73,20.33,20.3,45,26.64,71.42,26.64v-46.69c-4.35-.29-8.8-.94-13.2-1.97v37.75Zm-186.49,118.33c-5.61-7.08-8.96-16.24-8.96-27,0-30.18,23.63-46.13,55.14-42.82v-50.55c-4.58-.76-9.16-1.01-12.97-1.01h-.22v40.64c-31.51-3.29-55.14,12.64-55.14,42.84,0,17.66,9.04,31.05,22.15,37.89Zm115.07-41.18c0,63.68-48.79,97.42-94.78,97.42-19.91,0-38.4-6-53.71-16.45,17.19,17.03,40.85,27.34,66.91,27.34,45.99,0,94.78-33.74,94.78-97.42v-103.76c-4.58-3.09-8.98-6.7-13.2-10.91v103.78Z"
    />
    <path
      fill={textFill}
      d="m830.31,286.48h-56.42l-42.71,46.04v-110.11h-47.52v202.96h47.52v-37.55l18.81-19.79,28.72,57.08h55.4l-49.05-90.07,45.26-48.58Zm-382.96-19.36h49.31v158.26h50.57v-158.26h33.22l17.41-44.7h-150.5v44.7Zm161.95,158.26h47.52v-138.9h-47.52v138.9Zm23.63-205.5c-15.5,0-26.43,10.66-26.43,25.37s10.93,25.37,26.43,25.37,26.43-10.91,26.43-25.37-10.93-25.37-26.43-25.37Zm592.93,115.18l45.26-48.58h-56.42l-42.71,46.04v-110.11h-47.52v202.96h47.52v-37.55l18.81-19.79,28.72,57.08h55.4l-49.05-90.07Zm-260.63-112.64h-156.8v44.7h49.3v158.26h50.57v-158.26h39.51l17.42-44.7Zm59.73,47.18c-2.18-.16-4.38-.25-6.6-.25s-4.42.09-6.6.25c-42.46,3.16-73.98,36.68-73.98,79.41s31.51,76.27,73.98,79.43c2.18.16,4.38.25,6.6.25s4.42-.09,6.6-.25c42.44-3.16,73.95-36.72,73.95-79.43s-31.51-76.25-73.95-79.41Zm0,115.12c-2.11.38-4.31.56-6.6.56s-4.49-.18-6.6-.56c-16.7-2.89-27.72-16.8-27.72-35.72s11.02-32.82,27.72-35.72c2.11-.38,4.31-.56,6.6-.56s4.49.18,6.6.56c16.68,2.89,27.7,16.8,27.7,35.72s-11.02,32.82-27.7,35.72ZM324.16,148.11h-36.25v199.41c0,26.15-18.81,42.95-41.68,42.95-13.76,0-26.3-5.83-34.25-15.95-13.11-6.83-22.15-20.23-22.15-37.89,0-30.2,23.63-46.13,55.14-42.84v-40.64c-51.49.11-94.56,41.43-94.56,92.6,0,27.27,10.77,51.35,28.14,68.56,15.31,10.44,33.8,16.45,53.71,16.45,45.99,0,94.78-33.74,94.78-97.42v-103.78c4.22,4.21,8.62,7.82,13.2,10.91,17.46,11.74,37.28,15.73,58.22,15.73v-37.75c-14.5-3.29-28.89-10.53-40.42-22.41-15.08-9.93-27.74-25.54-33.89-47.93Z"
    />
  </svg>
);

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
        {lang === 'zh' ? '深受' : 'Trusted by'}
        <TikTokLogo
          textFill="#000"
          className={`${styles['tiktok-logo']} ${styles['tiktok-logo-light']}`}
        />
        <TikTokLogo
          textFill="#fff"
          className={`${styles['tiktok-logo']} ${styles['tiktok-logo-dark']}`}
        />
        {lang === 'zh' ? '信赖' : ''}
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
