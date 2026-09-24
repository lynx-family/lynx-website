import { useEffect, useRef } from 'react';
import { useLang } from '@rspress/core/runtime';
import { getVideoMaskTop } from './video-mask';
import showcaseStyles from '../showcase/index.module.less';
import styles from './index.module.less';
// Original inline logo images from https://www.retouchpics.com/.
import brandAssets from './brand-assets.json';

const demoVideo =
  'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynxtron/showcase-h264-960-20260922.mp4';

export const LynxtronShowcase = () => {
  const isZh = useLang() === 'zh';
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let frame = 0;
    let animation = 0;
    const update = (time: number) => {
      video.style.setProperty('--video-mask-top', `${getVideoMaskTop(time)}%`);
    };
    const sync = () => update(video.currentTime);
    // Follow decoded frames, not a separate CSS animation clock: buffering,
    // seeking and loop restarts must keep the mask aligned with the video.
    if (typeof video.requestVideoFrameCallback === 'function') {
      const tick: VideoFrameRequestCallback = (_, metadata) => {
        update(metadata.mediaTime);
        frame = video.requestVideoFrameCallback(tick);
      };
      frame = video.requestVideoFrameCallback(tick);
    } else {
      const tick = () => {
        sync();
        animation = requestAnimationFrame(tick);
      };
      animation = requestAnimationFrame(tick);
    }
    sync();
    video.addEventListener('seeked', sync);
    return () => {
      if (frame) video.cancelVideoFrameCallback(frame);
      if (animation) cancelAnimationFrame(animation);
      video.removeEventListener('seeked', sync);
    };
  }, []);

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
        ref={videoRef}
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
