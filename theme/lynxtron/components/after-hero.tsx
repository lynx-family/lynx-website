import React, { FC } from 'react';
import { useLang } from '@rspress/core/runtime';
import { SmallCard, LargeCard } from './Card';
import './after-hero.scss';
// icons are now provided via MaskIcon variants
import './extensible-widget.scss';
import extenstionWidgetSvg from '@assets/lynxtron/extension-widget.svg';
import MaskIcon from './MaskIcon';
const DICT: Record<string, { en: string; zh: string }> = {
  'lynxtron.afterHero.light.title': {
    en: 'Light-weight and Fast',
    zh: '轻量且高速',
  },
  'lynxtron.afterHero.light.desc': {
    en: 'Electron-like app framework with a light-weight UI renderer powered by Lynx',
    zh: '类 Electron 的应用框架，内置 Lynx 轻量级 UI 渲染器',
  },
  'lynxtron.afterHero.multi.title': {
    en: 'Multiplatform',
    zh: '多平台',
  },
  'lynxtron.afterHero.multi.desc': {
    en: 'With Lynx, your UI runs across platforms, including the Web, and can be ported to new hosts with minimal effort.',
    zh: '借助 Lynx，UI 可跨平台运行（包含 Web），并能以极低成本移植到新的宿主环境。',
  },
  'lynxtron.afterHero.extensible.title': {
    en: 'Natively Extensible',
    zh: '原生可扩展',
  },
  'lynxtron.afterHero.extensible.desc': {
    en: "Extend the renderer's capabilities with custom native modules via UI/texture extension C-APIs and Node-API.",
    zh: '通过 UI/纹理扩展 C-API 与 Node-API 编写自定义原生模块，扩展渲染器能力。',
  },
};
const t = (key: string, lang: 'en' | 'zh') => {
  const item = DICT[key];
  if (!item) return key;
  return item[lang] ?? item.en ?? key;
};
const ExtensibleWidget: FC = () => {
  return (
    <div className="extensible-widget extensible-widget-bg">
      <div className="graph">
        <img className="bg-img" src={extenstionWidgetSvg} />
        <div className="icon-container left">
          <MaskIcon variant="windows" className="icon" />
        </div>
        <div className="icon-container middle">
          <MaskIcon variant="apple" className="icon" />
        </div>
        <div className="icon-container right">
          <MaskIcon variant="cplus" className="icon" />
        </div>
      </div>
    </div>
  );
};

export const AfterHero: FC = () => {
  const lang = (useLang() === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
  return (
    <section className="after-hero">
      <div className="after-hero-content">
        <div className="ah-grid">
          <SmallCard
            title={t('lynxtron.afterHero.light.title', lang)}
            desc={t('lynxtron.afterHero.light.desc', lang)}
            iconVariant="lightning"
          />
          <SmallCard
            title={t('lynxtron.afterHero.multi.title', lang)}
            desc={t('lynxtron.afterHero.multi.desc', lang)}
            iconVariant="multiplatform"
          />
          <LargeCard
            title={t('lynxtron.afterHero.extensible.title', lang)}
            desc={t('lynxtron.afterHero.extensible.desc', lang)}
            iconVariant="extensible"
          >
            <ExtensibleWidget />
          </LargeCard>
        </div>
      </div>
    </section>
  );
};
