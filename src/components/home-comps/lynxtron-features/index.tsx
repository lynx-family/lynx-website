import type { ReactNode } from 'react';
import { useLang } from '@rspress/core/runtime';
import cls from 'classnames';
import { FeatureIcon, type FeatureIconVariant } from './FeatureIcon';
import { ExtensibleWidget } from './extensible-widget';
import styles from './index.module.less';

const FEATURES: Array<{
  iconVariant: FeatureIconVariant;
  title: { en: string; zh: string };
  desc: { en: string; zh: string };
}> = [
  {
    iconVariant: 'lightning',
    title: {
      en: 'Light-weight and Fast',
      zh: '轻量且高速',
    },
    desc: {
      en: 'Electron-like app framework with a light-weight UI renderer powered by Lynx',
      zh: '类 Electron 的应用框架，内置 Lynx 轻量级 UI 渲染器',
    },
  },
  {
    iconVariant: 'multiplatform',
    title: {
      en: 'Multiplatform',
      zh: '多平台',
    },
    desc: {
      en: 'With Lynx, your UI runs across platforms, including the Web, and can be ported to new hosts with minimal effort.',
      zh: '借助 Lynx，UI 可跨平台运行（包含 Web），并能以极低成本移植到新的宿主环境。',
    },
  },
  {
    iconVariant: 'extensible',
    title: {
      en: 'Natively Extensible',
      zh: '原生可扩展',
    },
    desc: {
      en: "Extend the renderer's capabilities with custom native modules via UI/texture extension C-APIs and Node-API.",
      zh: '通过 UI/纹理扩展 C-API 与 Node-API 编写自定义原生模块，扩展渲染器能力。',
    },
  },
];

type CardContentProps = {
  title: ReactNode;
  desc: ReactNode;
  iconVariant: FeatureIconVariant;
};

const SmallCard = ({
  title,
  desc,
  iconVariant,
  className,
}: CardContentProps & { className?: string }) => {
  return (
    <div className={cls(styles['ah-card'], styles['ah-small'], className)}>
      <div className={styles['ah-icon']}>
        <FeatureIcon variant={iconVariant} className={styles['feature-icon']} />
      </div>
      <div className={styles['ah-content']}>
        <div className={styles['ah-title']}>{title}</div>
        <div className={styles['ah-desc']}>{desc}</div>
      </div>
    </div>
  );
};

const LargeCard = ({
  title,
  desc,
  iconVariant,
  children,
}: CardContentProps & { children?: ReactNode }) => {
  return (
    <div className={cls(styles['ah-card'], styles['ah-large'])}>
      <SmallCard title={title} desc={desc} iconVariant={iconVariant} />
      <div className={styles['ah-large-right']}>{children}</div>
    </div>
  );
};

/**
 * The feature-card row on the Lynxtron home: two small cards plus a
 * double-width card hosting the ExtensibleWidget illustration.
 */
export const LynxtronFeatures = () => {
  const lang = useLang() === 'zh' ? 'zh' : 'en';
  const [light, multi, extensible] = FEATURES;
  return (
    <section className={styles['after-hero']}>
      <div className={styles['ah-grid']}>
        <SmallCard
          title={light.title[lang]}
          desc={light.desc[lang]}
          iconVariant={light.iconVariant}
        />
        <SmallCard
          title={multi.title[lang]}
          desc={multi.desc[lang]}
          iconVariant={multi.iconVariant}
        />
        <LargeCard
          title={extensible.title[lang]}
          desc={extensible.desc[lang]}
          iconVariant={extensible.iconVariant}
        >
          <ExtensibleWidget />
        </LargeCard>
      </div>
    </section>
  );
};
