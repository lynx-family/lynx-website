import type { FC, ReactNode } from 'react';
import { useLang } from '@rspress/core/runtime';
import cls from 'classnames';
import { MaskIcon, type MaskIconVariant } from './mask-icon';
import { ExtensibleWidget } from './extensible-widget';
import styles from './index.module.less';

const FEATURES: Array<{
  iconVariant: MaskIconVariant;
  title: { en: string; zh: string };
  desc: { en: string; zh: string };
}> = [
  {
    iconVariant: 'lightning',
    title: {
      en: 'Lightweight and Fast',
      zh: '轻量且高速',
    },
    desc: {
      en: 'Build desktop apps with an Electron-style application model and a lightweight Lynx renderer.',
      zh: '使用类 Electron 的应用模型和轻量级 Lynx 渲染器构建桌面应用。',
    },
  },
  {
    iconVariant: 'multiplatform',
    title: {
      en: 'Multiplatform',
      zh: '多平台',
    },
    desc: {
      en: 'Share UI code built with Lynx across desktop, mobile, and the web, with adapters for platform-specific capabilities.',
      zh: '在桌面、移动端和 Web 之间共享用 Lynx 编写的界面代码，通过适配层接入各平台的专属能力。',
    },
  },
  {
    iconVariant: 'extensible',
    title: {
      en: 'Natively Extensible',
      zh: '原生可扩展',
    },
    desc: {
      en: 'Add native UI, textures, and system capabilities through C APIs and Node-API.',
      zh: '通过 C API 和 Node-API 接入原生 UI、纹理和系统能力。',
    },
  },
];

type CardContentProps = {
  title: ReactNode;
  desc: ReactNode;
  iconVariant: MaskIconVariant;
};

const SmallCard: FC<CardContentProps & { className?: string }> = ({
  title,
  desc,
  iconVariant,
  className,
}) => {
  return (
    <div className={cls(styles['ah-card'], styles['ah-small'], className)}>
      <div className={styles['ah-icon']}>
        <MaskIcon variant={iconVariant} />
      </div>
      <div className={styles['ah-content']}>
        <div className={styles['ah-title']}>{title}</div>
        <div className={styles['ah-desc']}>{desc}</div>
      </div>
    </div>
  );
};

const LargeCard: FC<CardContentProps & { children?: ReactNode }> = ({
  title,
  desc,
  iconVariant,
  children,
}) => {
  return (
    <div className={cls(styles['ah-card'], styles['ah-large'])}>
      <SmallCard title={title} desc={desc} iconVariant={iconVariant} />
      <div className={styles['ah-large-right']}>{children}</div>
    </div>
  );
};

/**
 * The feature-card row on the Lynxtron home: two small cards plus a
 * double-width card hosting the ExtensibleWidget artwork.
 */
export const LynxtronFeatures: FC = () => {
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
