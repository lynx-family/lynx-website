import { Space } from '@douyinfe/semi-ui';
import useIfMobile from '@site/theme/hooks/use-if-mobile';
import { useTiltEffect } from '@site/src/hooks';
import React, { ReactNode, useState } from 'react';
import styles from './index.module.less';
import { Moon } from './moon';
import { WriteOnceRunAllPlatform } from './write-once-run-all-platform';
import cls from 'classnames';
import { useLang } from '@rspress/core/runtime';
import { BorderBeam } from '../border-beam';
import { ActionBtn } from './action-btn';
import { FeatureItem } from './feature-item';
import {
  IconAndroid,
  IconHarmony,
  IconIOS,
  IconMacOS,
  IconMisoLynx,
  IconOctaneLynx,
  IconReactLynx,
  IconVueLynx,
  IconWeb,
  IconWindows,
} from './icon';
import { FeatureIconItem } from './item-icon';
type FeaturesConfigKey = '/' | '/react/' | '/rspeedy/';
export interface FeatureCardItem {
  title: { en: string; zh: string };
  desc: { en: string; zh: string };
  class?: string;
  isRowSet?: boolean | number;
  /**
   * Render the card's action buttons as a full-width vertical stack
   * (one button per row) instead of the default horizontal wrap with
   * fixed 191/390px widths. Use for cards whose actions are the focal
   * content — e.g. the platform picker on Write Once, Render Anywhere
   * or the framework picker on Framework Agnostic.
   */
  stackedActions?: boolean;
  iconClass?: string;
  actions?: {
    text: string | React.ReactNode;
    link?: string;
    size: string;
  }[];
  customRender?: ReactNode;
}
const featuresConfig: Record<FeaturesConfigKey, FeatureCardItem[]> = {
  '/': [
    {
      stackedActions: true,
      title: {
        en: 'Write Once, Render Anywhere',
        zh: '一次编写，多端渲染',
      },
      desc: {
        en: 'Enjoy native rendering on iOS, Android, HarmonyOS and Web, or pixel-perfect consistency across mobile and desktop via our custom renderer.',
        zh: '享受 iOS， Android，鸿蒙, Web 原生渲染，或选择在移动和桌面端达到像素级一致的自渲染。',
      },
      actions: [
        {
          text: (
            <Space>
              <IconIOS />
              iOS
            </Space>
          ),
          size: 'large',
          link: 'guide/start/integrate-with-existing-apps.html?platform=ios',
        },
        {
          text: (
            <Space>
              <IconAndroid />
              Android
            </Space>
          ),
          link: 'guide/start/integrate-with-existing-apps.html?platform=android',
          size: 'large',
        },
        {
          text: (
            <Space>
              <IconHarmony />
              HarmonyOS
            </Space>
          ),
          size: 'large',
          link: 'guide/start/integrate-with-existing-apps.html?platform=harmony',
        },
        {
          text: (
            <Space>
              <IconWeb />
              Web
            </Space>
          ),
          size: 'large',
          link: 'guide/start/integrate-with-existing-apps.html?platform=web',
        },
        {
          text: (
            <Space>
              <IconMacOS />
              <IconWindows />
              Desktop
            </Space>
          ),
          size: 'large',
          link: 'guide/start/integrate-with-existing-apps.html?platform=macos',
        },
      ],
    },
    {
      stackedActions: true,
      title: {
        en: 'Performance at Scale',
        zh: '高性能，规模化',
      },
      desc: {
        en: 'Instant launch and silky UI responsiveness via our perf-driven, proven-at-scale multithreaded architecture, across engine and framework, standalone or embedded.',
        zh: '基于面向性能设计、经规模验证的多线程架构，从引擎到框架一以贯之，带来瞬时启动和丝滑交互体验，无论是单页还是嵌入场景。',
      },
      customRender: <WriteOnceRunAllPlatform />,
    },
    {
      stackedActions: true,
      title: {
        en: 'Web-Inspired Design',
        zh: 'Web 启发',
      },
      desc: {
        en: "Leverage your knowledge of CSS and JavaScript, and the mindset behind it. Lynx is designed around the web's programming model, libraries, and frameworks.",
        zh: '延续 Web 的编程范式与心智模型，继续使用熟悉的 CSS 和 JavaScript，复用已有的知识、生态与框架。',
      },
      customRender: <Moon />,
    },
    {
      stackedActions: true,
      title: {
        en: 'Framework Agnostic',
        zh: '不止于一个框架',
      },
      desc: {
        en: 'Lynx is a platform for frameworks. ReactLynx (official), Vue, Octane, and Miso for Haskell all integrate through the same standardized APIs. All frameworks welcome.',
        zh: 'Lynx 是一个面向框架的平台。ReactLynx（官方）、Vue、Octane 与适用于 Haskell 的 Miso 都通过同一套标准化 API 接入。欢迎所有框架加入。',
      },
      actions: [
        {
          text: (
            <Space>
              <IconReactLynx />
              React
            </Space>
          ),
          size: 'large',
          link: '/react/',
        },
        {
          text: (
            <Space>
              <IconVueLynx />
              Vue
            </Space>
          ),
          size: 'large',
          link: 'https://vue.lynxjs.org/',
        },
        {
          text: (
            <Space>
              <IconOctaneLynx />
              Octane
            </Space>
          ),
          size: 'large',
          link: 'https://octanejs.dev',
        },
        {
          text: (
            <Space>
              <IconMisoLynx />
              Miso
            </Space>
          ),
          size: 'large',
          link: 'https://github.com/haskell-miso/miso-lynx',
        },
      ],
    },
  ],
  '/react/': [
    {
      iconClass: 'react',
      isRowSet: 508,
      title: {
        en: 'Aligned with React 17+',
        zh: '对齐 React 17+',
      },
      desc: {
        en: 'Built on battle-tested open-source implementations, it fully supports functional components, Hooks, and Context—the same set of modern React APIs.',
        zh: '基于成熟的开源实现并有测试保障，完整支持函数式组件、Hooks、Context 等现代 React API。',
      },
      actions: [
        {
          text: 'Hooks',
          link: 'https://react.dev/reference/react/hooks',
          size: 'large',
        },
        {
          text: 'Context',
          link: 'https://react.dev/reference/react/hooks#context-hooks',
          size: 'large',
        },
      ],
    },
    {
      iconClass: 'performance',
      class: 'item3',
      title: {
        en: 'Made for Lynx',
        zh: '为 Lynx 量身定做',
      },
      desc: {
        en: "Dual-threaded React tailor-made for Lynx, carrying over Lynx's instant launch and silky UI responsiveness.",
        zh: '基于 Lynx 量身定做的双线程 React，延续 Lynx 的瞬时启动和丝滑交互。',
      },
    },
    {
      iconClass: 'ecosystem',
      title: {
        en: 'Compatible with React Ecosystem',
        zh: 'React 生态兼容',
      },
      desc: {
        en: 'With Jotai and Zustand for state management, TanStack Query for data fetching, Fast Refresh and DevTools for React components, everything you need is here.',
        zh: 'Jotai、Zustand 等状态管理、TanStack Query 数据请求、Fast Refresh 热更新和 React 开发工具，应有尽有。',
      },
      actions: [
        {
          text: 'Jotai',
          link: 'https://jotai.org/',
          size: 'normal',
        },
        {
          text: 'Zustand',
          link: 'https://zustand-demo.pmnd.rs/',
          size: 'normal',
        },
        {
          text: 'Tanstack Query',
          link: 'https://tanstack.com/query',
          size: 'large',
        },
      ],
    },
  ],
  '/rspeedy/': [
    {
      iconClass: 'rstack',
      class: 'item4',
      isRowSet: true,
      title: {
        en: 'Rstack-based',
        zh: '基于 Rstack',
      },
      desc: {
        en: 'Using Rspack and Rsbuild to bring you the ultimate development experience.',
        zh: '享受 Rstack 带来的极致开发体验。',
      },
    },
    {
      iconClass: 'batteries',
      title: {
        en: 'Batteries Included',
        zh: '开箱即用',
      },
      desc: {
        en: 'Out-of-the-box integration with the most practical building features in the ecosystem.',
        zh: '集成生态中最实用的构建功能。',
      },
    },
    {
      iconClass: 'config',
      title: {
        en: 'Easy to Configure',
        zh: '易于配置',
      },
      desc: {
        en: 'Start with zero configuration and everything is configurable.',
        zh: '以零配置启动，然后一切皆可配置。',
      },
    },
  ],
};

const Features = ({
  src = '/',
  items,
}: {
  src?: string;
  /** Custom card configs; bypasses the path-keyed `featuresConfig` lookup. */
  items?: FeatureCardItem[];
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const lang = useLang() as 'en' | 'zh';
  const configKey = (
    src.startsWith('/react/')
      ? '/react/'
      : src.startsWith('/rspeedy/')
        ? '/rspeedy/'
        : '/'
  ) as FeaturesConfigKey;
  const isMobile = useIfMobile();

  const featuresConfigTarget = items ?? featuresConfig[configKey];

  const doBeamBorder = (isHover: boolean, index: number) => {
    if (isHover) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  useTiltEffect('#hover-feature-item', { isMobile });

  return (
    <div className={styles['features-frame']}>
      <div className={styles['list-frame']}>
        {featuresConfigTarget.map((item, index) => (
          <div
            className={cls(
              styles['list-item'],
              !!item.isRowSet && styles['row-set'],
              item.stackedActions && styles['stacked-actions'],
            )}
            key={index}
            id="hover-feature-item"
            onMouseEnter={() => {
              doBeamBorder(true, index);
            }}
            onMouseLeave={() => {
              doBeamBorder(false, index);
            }}
            style={
              !!item.isRowSet && typeof item.isRowSet === 'number'
                ? { paddingRight: `${item.isRowSet}px` }
                : {}
            }
          >
            {!!item.iconClass && <FeatureIconItem index={item.iconClass} />}
            <div className={cls(styles['title'])}>{item.title[lang]}</div>
            <div className={cls(styles['desc'])}>{item.desc[lang]}</div>
            {item.customRender !== undefined && item.customRender}
            {!!item.actions?.length && (
              <div className={styles['action-frame']}>
                {item.actions.map((action, actionIndex) => (
                  <ActionBtn
                    key={actionIndex}
                    text={action.text}
                    link={action.link}
                    size={action.size}
                  />
                ))}
              </div>
            )}
            {!!item.class && <FeatureItem index={item.class} />}
            {hoverIndex === index && !isMobile && (
              <BorderBeam color="#3b82f6" size={2} duration={3} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { Features };
