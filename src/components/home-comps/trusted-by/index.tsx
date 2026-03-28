import React from 'react';
import styles from './index.module.less';

const apps = [
  {
    name: 'TikTok',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/f4/95/3c/f4953cfb-b350-6763-a0b4-ceed8cef74ed/TikTok_AppIcon26-0-0-1x_U007epad-0-1-0-0-85-220.png/128x128bb.jpg',
  },
  {
    name: 'CapCut',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a9/ad/b3/a9adb3da-005c-2255-cb06-fad14425d9a6/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/128x128bb.jpg',
  },
  {
    name: 'Hypic',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/49/3b/6a/493b6a1f-8aa5-8c88-6ebe-15a0bbfe7573/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/128x128bb.jpg',
  },
  {
    name: 'Lemon8',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5f/d0/24/5fd02457-e750-4dd4-5da7-82a20ebbdfd6/AppIconOriginal-0-0-1x_U007emarketing-0-8-0-85-220.png/128x128bb.jpg',
  },
  {
    name: 'Doubao',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/e7/e3/51/e7e351d5-afa0-66a1-7081-22f15531aa91/AppIcon-0-0-1x_U007epad-0-8-0-sRGB-85-220.png/128x128bb.jpg',
  },
  {
    name: 'Gauth',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/62/98/8b/62988bc5-694a-7105-3c75-9de354dc9169/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/128x128bb.jpg',
  },
  {
    name: 'Tokopedia',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/8d/6e/be/8d6ebe18-1679-96ee-17b0-790800f5ef34/MainAppIcon-0-0-1x_U007epad-0-1-0-0-85-220.png/128x128bb.jpg',
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
        <span className={styles['icon-name']}>{app.name}</span>
      </div>
    ))}
  </div>
);

export const TrustedBy: React.FC = () => {
  return (
    <div className={styles['trusted-by']}>
      <div className={styles['marquee-outer']}>
        <div className={styles['marquee-wrapper']}>
          <div className={styles['marquee-track']}>
            <IconList offset={0} />
            <IconList offset={1} />
          </div>
        </div>
      </div>
    </div>
  );
};
