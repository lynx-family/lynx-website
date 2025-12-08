import case0src from '@assets/home/home-s-case-0.webp';
import case1src from '@assets/home/home-s-case-1.webp';
import cls from 'classnames';
import styles from './index.module.less';

type CaseKey = 'case-0' | 'case-1';

export const MobileShow = ({ preview }: { preview: CaseKey }) => {
  const caseList = {
    'case-0': {
      image: case0src,
      video:
        'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/killers/ifr.mp4',
    },
    'case-1': {
      image: case1src,
      video:
        'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/killers/mts.mp4',
    },
  };

  return (
    <div className={styles.mobileShowFrame}>
      <div className={cls(styles.preview)}>
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={caseList[preview].image}
          aria-label={`Case ${preview.split('-')[1]} preview`}
        >
          <source src={caseList[preview].video} type="video/mp4" />
          <img
            src={caseList[preview].image}
            alt={`Case ${preview.split('-')[1]} preview`}
          />
        </video>
      </div>
    </div>
  );
};
