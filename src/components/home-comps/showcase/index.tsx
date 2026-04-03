import React from 'react';
import { useLang } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import styles from './index.module.less';
import { MobileShow } from './mobile-show';
import { TrustedBy } from '../trusted-by';
import tiktokLogoBlack from './tiktok-logo-black.svg';
import tiktokLogoWhite from './tiktok-logo-white.svg';
import capcutLogoBlack from './capcut-logo-black.svg';
import capcutLogoWhite from './capcut-logo-white.svg';

const showCaseList = [
  {
    title: {
      en: 'Two-Column Waterfall Gallery',
      zh: '双列瀑布流',
    },
    desc: {
      en: 'Cover everything you need to know to start building with Lynx.',
      zh: '从零开始，快速上手 Lynx 开发。',
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
      zh: '商品详情轮播',
    },
    desc: {
      en: 'Deep dive into main thread scripting by building a highly responsive swiper.',
      zh: '深入主线程脚本，打造高性能轮播。',
    },
    class: 'case-1',
    link: {
      en: '/guide/start/tutorial-product-detail',
      zh: '/zh/guide/start/tutorial-product-detail',
    },
  },
] as const;

const sectionSubtitle = {
  en: 'Powering native experiences for billions',
  zh: '服务数十亿用户的跨端框架',
} as const;

const tryTitle = {
  en: 'Now, try it yourself',
  zh: '现在，轮到你了',
} as const;

const trySubtitle = {
  en: 'Build in minutes with our hands-on tutorials.',
  zh: '跟随教程，几分钟上手',
} as const;

export const ShowCase: React.FC<{ showMarquee?: boolean }> = ({
  showMarquee = false,
}) => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className={styles['show-case-frame']}>
      {/* Act 1: Credibility */}
      <div className={styles['section-title']}>
        <span className={`${styles['title-line']} ${styles['title-line-sub']}`}>
          {lang === 'zh' ? '信赖之选' : 'Trusted by'}
        </span>
        <span className={styles['title-line']}>
          <a
            href="https://www.tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={tiktokLogoBlack}
              alt="TikTok"
              className={`${styles['tiktok-logo']} ${styles['logo-light']}`}
            />
            <img
              src={tiktokLogoWhite}
              alt="TikTok"
              className={`${styles['tiktok-logo']} ${styles['logo-dark']}`}
            />
          </a>

          <a
            href="https://www.capcut.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={capcutLogoBlack}
              alt="CapCut"
              className={`${styles['capcut-logo']} ${styles['logo-light']}`}
            />
            <img
              src={capcutLogoWhite}
              alt="CapCut"
              className={`${styles['capcut-logo']} ${styles['logo-dark']}`}
            />
          </a>
        </span>
      </div>
      <p className={styles['section-subtitle']}>{sectionSubtitle[lang]}</p>
      {showMarquee && <TrustedBy />}

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
                    ? '开始教程 \u2192'
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
