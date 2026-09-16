import { useLang } from '@rspress/core/runtime';
import showcaseStyles from '../showcase/index.module.less';
import styles from './index.module.less';
// Original inline logo images from https://www.retouchpics.com/.
import brandAssets from './brand-assets.json';

const demoVideo =
  'https://lf3-s.vlabstatic.com/obj/vilab-static/ies/retouch/retouch_pro_pc/cn/static/media/edit-intro.30aa765da1.mp4';

export const LynxtronShowcase = () => {
  const isZh = useLang() === 'zh';

  return (
    <section
      className={`${showcaseStyles['show-case-frame']} ${styles.section}`}
    >
      <h2 className={showcaseStyles['section-title']}>
        <span className={showcaseStyles['title-line-sub']}>
          {isZh ? '信赖之选' : 'Trusted by'}
        </span>
        <a
          className={styles.brand}
          href="https://www.retouchpics.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={isZh ? '醒图官网' : 'Retouch Pics official website'}
        >
          <img
            className={styles.mark}
            src={brandAssets.mark}
            alt=""
            draggable={false}
          />
          <img
            className={styles.wordmark}
            src={brandAssets.wordmark}
            alt="醒图"
            draggable={false}
          />
        </a>
      </h2>
      <video
        className={styles.video}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={
          isZh ? '醒图专业版产品演示' : 'Retouch Pics desktop product demo'
        }
      >
        <source src={demoVideo} type="video/mp4" />
        {isZh
          ? '您的浏览器不支持视频播放。'
          : 'Your browser does not support video playback.'}
      </video>
    </section>
  );
};
