import React from 'react';
import { useLang } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import styles from './index.module.less';
import { MobileShow } from './mobile-show';

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

const headline = {
  en: 'See Lynx in Action',
  zh: 'Lynx 实战',
} as const;

const demoInvite = {
  en: 'Now, try it yourself.',
  zh: '现在，亲手体验。',
} as const;

/** Inline TikTok wordmark — official Simplified Primary Logo, currentColor */
const TikTokWordmark: React.FC = () => (
  <svg viewBox="0 0 1329 533.8" height={38} aria-label="TikTok" role="img">
    <path
      d="M783.7,257.6h-54.2L688.4,302v-106h-45.7v195.4h45.7v-36.2l18.1-19l27.6,55h53.3l-47.2-86.7L783.7,257.6L783.7,257.6z M414.7,240.1h47.4v151.2h48.6V240.1h30.8l17.3-44.2H414.7L414.7,240.1L414.7,240.1z M570.4,391.4h45.7V257.6h-45.7V391.4z M593.1,193.5c-14.9,0-25.4,10.3-25.4,24.4s10.5,24.4,25.4,24.4s25.4-10.5,25.4-24.4S608,193.5,593.1,193.5z M1156.3,304.4l43.5-46.8h-54.2l-41.1,44.3v-106h-45.7v195.4h45.7v-36.2l18.1-19l27.6,55h53.3L1156.3,304.4L1156.3,304.4z M914.9,195.9H764.1v44.2h47.4v151.2h48.6V240.1h37.4L914.9,195.9L914.9,195.9z M961.4,241.1c-44,0-77.4,33.5-77.4,76.7s33.5,76.7,77.4,76.7s77.4-33.5,77.4-76.7S1005.4,241.1,961.4,241.1L961.4,241.1z M961.4,352.8c-19.5,0-33-14.4-33-34.9s13.4-34.9,33-34.9s33,14.4,33,34.9S981,352.8,961.4,352.8z M302.9,125.6h-45.2v192c0,25.2-18.1,41.4-40.1,41.4s-41.5-16.2-41.5-41.4c0-29.1,22.7-44.4,53-41.2v-48.6c-4.4-0.7-8.8-1-12.5-1c-49.6,0-91.1,39.8-91.1,89.2c0,52.3,41,92.3,91.4,92.3c44.2,0,91.1-32.5,91.1-93.8v-99.9c19.5,19.5,43.2,25.6,68.6,25.6v-44.9C345.4,193,310.8,172.5,302.9,125.6L302.9,125.6z"
      fill="currentColor"
    />
  </svg>
);

/** Inline CapCut wordmark — paths from capcut-wordmark.svg, currentColor */
const CapCutWordmark: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0.5 0 127.2 24"
    height={34}
    aria-label="CapCut"
    role="img"
  >
    <path
      d="M 31.056 4.979 V 0.215 l -5.73 3.008 v -0.178 C 25.326 1.146 23.965 0 21.994 0 H 3.831 C 1.755 0 0.5 1.146 0.5 3.045 v 4.8 L 8.523 12 L 0.5 16.191 v 4.8 C 0.5 22.854 1.755 24 3.831 24 h 18.162 c 1.97 0 3.33 -1.146 3.33 -3.009 v -0.25 l 5.731 3.044 V 18.95 L 17.73 12 l 13.327 -7.021 Z M 13.11 14.363 l 9.852 5.16 H 3.22 l 9.888 -5.16 Z m 9.78 -9.885 L 13.109 9.6 L 3.222 4.478 h 19.666 Z M 48.251 19.174 c -5.746 0 -9.76 -3.648 -9.76 -8.874 c 0 -5.226 4.014 -8.874 9.76 -8.874 c 1.45 0 3.153 0.164 5.763 1.352 v 3.717 c -1.889 -1.053 -3.756 -1.587 -5.55 -1.587 c -3.6 0 -6.114 2.218 -6.114 5.39 c 0 3.173 2.514 5.392 6.114 5.392 c 1.745 0 3.663 -0.544 5.55 -1.574 v 3.705 c -2.612 1.188 -4.313 1.352 -5.763 1.352 v 0.001 Z M 61.71 19.174 c -3.397 0 -5.769 -2.58 -5.769 -6.273 c 0 -3.693 2.475 -6.3 5.884 -6.3 c 1.884 0 3.194 0.575 4.247 1.868 l 0.085 0.102 V 7.214 h 3.322 v 11.692 h -3.322 v -1.66 l -0.087 0.124 c -0.854 1.231 -2.24 1.804 -4.36 1.804 Z m 1.148 -9.786 c -1.99 0 -3.434 1.478 -3.434 3.513 c 0 2.036 1.444 3.487 3.434 3.487 c 1.99 0 3.46 -1.468 3.46 -3.487 s -1.454 -3.513 -3.46 -3.513 Z M 71.999 24 V 7.214 h 3.35 v 1.46 l 0.086 -0.12 C 76.078 7.651 77.6 6.6 79.774 6.6 c 3.34 0 5.763 2.65 5.763 6.3 s -2.382 6.273 -5.79 6.273 c -2.034 0 -3.485 -0.585 -4.312 -1.743 l -0.087 -0.12 V 24 h -3.35 Z m 6.62 -14.614 c -1.99 0 -3.431 1.478 -3.431 3.514 c 0 2.035 1.444 3.486 3.432 3.486 s 3.407 -1.467 3.407 -3.486 c 0 -2.02 -1.433 -3.514 -3.407 -3.514 Z M 97.344 19.174 c -5.747 0 -9.76 -3.648 -9.76 -8.874 c 0 -5.226 4.013 -8.874 9.76 -8.874 c 1.449 0 3.152 0.164 5.763 1.352 v 3.717 c -1.89 -1.053 -3.757 -1.587 -5.549 -1.587 c -3.6 0 -6.114 2.218 -6.114 5.39 c 0 3.173 2.514 5.392 6.114 5.392 c 1.745 0 3.663 -0.544 5.549 -1.574 v 3.705 c -2.612 1.188 -4.314 1.352 -5.763 1.352 v 0.001 Z M 111.301 19.174 c -3.746 0 -6.165 -1.768 -6.165 -4.502 V 6.867 h 3.323 v 6.835 c 0 1.68 1.063 2.683 2.842 2.683 c 1.779 0 2.791 -1.002 2.791 -2.682 V 6.867 h 3.322 v 7.802 c 0 2.736 -2.399 4.503 -6.113 4.503 v 0.001 Z M 124.747 19.174 c -3.679 0 -4.986 -2.282 -4.986 -4.236 V 6.242 l 3.322 -1.748 v 2.374 h 4.586 v 2.718 h -4.586 v 4.682 c 0 0.629 0.24 2.092 2.468 2.092 c 0.618 0 1.386 -0.163 2.116 -0.448 v 2.8 c -1.162 0.426 -2.527 0.46 -2.922 0.46 l 0.002 0.002 Z"
      fill="currentColor"
    />
  </svg>
);

export const ShowCase: React.FC = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <section className={styles['in-action']}>
      <h2 className={styles.headline}>{headline[lang]}</h2>
      <div className={styles.wordmarks}>
        <TikTokWordmark />
        <CapCutWordmark />
      </div>
      <h3 className={styles['demo-invite']}>{demoInvite[lang]}</h3>
      <ul className={styles['demo-list']}>
        {showCaseList.map((item, index) => (
          <li className={styles['demo-item']} key={index}>
            <MobileShow preview={item.class} />
            <div className={`${styles['demo-title']} pb-2`}>
              {item.title[lang]}
            </div>
            <div className={`${styles['demo-desc']} pb-2`}>
              {item.desc[lang]}
            </div>
            {!!item.link && (
              <Link
                href={item.link[lang]}
                style={{
                  color: 'var(--home-showcase-item-link-color)',
                  fontSize: '14px',
                  lineHeight: '24px',
                }}
              >
                {lang === 'zh' ? '跟随教程编写' : 'Learn by doing'}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
