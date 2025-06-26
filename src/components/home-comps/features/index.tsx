import { Space } from '@douyinfe/semi-ui';
import useIfMobile from '@site/theme/hooks/use-if-mobile';
import React, { ReactNode, useEffect, useState } from 'react';
import styles from './index.module.less';
import { Moon } from './moon';
import { WriteOnceRunAllPlatform } from './write-once-run-all-platform';
import cls from 'classnames';
import { useLang } from '@rspress/core/runtime';
import { BorderBeam } from '../border-beam';
import { ActionBtn } from './action-btn';
import { FeatureItem } from './feature-item';
import { IconAndroid, IconIOS, IconWeb } from './icon';
import { FeatureIconItem } from './item-icon';
type FeaturesConfigKey = '/' | '/react/' | '/rspeedy/';

// 最大倾斜角度（度数）
const maxDegree = 6;
const featuresConfig: Record<
  FeaturesConfigKey,
  Array<{
    title: { en: string; zh: string };
    desc: { en: string; zh: string };
    class?: string;
    isRowSet?: boolean | number;
    iconClass?: string;
    actions?: {
      text: string | React.ReactNode;
      link?: string;
      size: string;
    }[];
    customRender?: ReactNode;
  }>
> = {
  '/': [
    {
      title: {
        en: 'Write Once, Render Anywhere',
        zh: '一次编写，多端渲染',
      },
      desc: {
        en: 'Enjoy native rendering on Android, iOS, and Web, or pixel-perfect consistency across mobile and desktop via our custom renderer.',
        zh: '享受 Android， iOS， Web 原生渲染，或选择在移动和桌面端达到像素级一致的自渲染。',
      },
      actions: [
        {
          text: (
            <Space>
              <IconAndroid />
              Android
            </Space>
          ),
          size: 'large',
        },
        {
          text: (
            <Space>
              <IconIOS />
              iOS
            </Space>
          ),
          size: 'large',
        },
        {
          text: (
            <Space>
              <IconWeb />
              Web
            </Space>
          ),
          size: 'large',
        },
      ],
    },
    {
      title: {
        en: 'Performance at Scale',
        zh: '高性能，规模化',
      },
      desc: {
        en: 'Achieve instant launch and silky UI responsiveness via our multithreaded engine, whether standalone or embedded.',
        zh: '基于多线程引擎，带来瞬时启动和丝滑交互体验，无论是单页还是嵌入场景。',
      },
      customRender: <WriteOnceRunAllPlatform />,
    },
    {
      isRowSet: true,
      // class: 'item2',
      title: {
        en: 'Web-Inspired Design',
        zh: 'Web 启发',
      },
      desc: {
        en: 'Leverage your existing knowledge of CSS and React. We designed Lynx with the web knowledge and libraries in mind.',
        zh: '延续 Web 开发范式，继续使用熟悉的 CSS 和 React 等技术，复用知识与生态。',
      },
      customRender: <Moon />,
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

const Features = ({ src = '/' }: { src?: string }) => {
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

  const featuresConfigTarget = featuresConfig[configKey];

  const doBeamBorder = (isHover: boolean, index: number) => {
    if (isHover) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  useEffect(() => {
    if (isMobile) return;

    const items = document.querySelectorAll('#hover-feature-item');

    const handleMouseMove = (e: MouseEvent, item: HTMLElement) => {
      const rect = item.getBoundingClientRect();

      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      const rotateX = -y * maxDegree;
      const rotateY = x * maxDegree;

      item.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = (item: HTMLElement) => {
      item.style.transform = 'none';
    };

    items.forEach((item) => {
      item.addEventListener('mousemove', (e) =>
        handleMouseMove(e as MouseEvent, item as HTMLElement),
      );
      item.addEventListener('mouseleave', () =>
        handleMouseLeave(item as HTMLElement),
      );
    });

    return () => {
      items.forEach((item) => {
        item.removeEventListener('mousemove', (e) =>
          handleMouseMove(e as MouseEvent, item as HTMLElement),
        );
        item.removeEventListener('mouseleave', () =>
          handleMouseLeave(item as HTMLElement),
        );
      });
    };
  }, []);

  return (
    <div className={styles['features-frame']}>
      <div className={styles['list-frame']}>
        {featuresConfigTarget.map((item, index) => (
          <div
            className={cls(
              styles['list-item'],
              !!item.isRowSet && styles['row-set'],
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
