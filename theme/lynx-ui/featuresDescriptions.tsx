// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

export interface feature {
  title: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  details?: unknown;
}
export const descriptions = {
  consistency: {
    title: {
      zh: '多平台一致',
      en: 'Consistent across multiple platforms',
    },
    description: {
      zh: '平台差异能够在这一层轻松地被抹平，将历史一致性解决方案沉淀下来，提供长期一致性保障',
      en: 'Smoothed out platform differencesat at this layer. Accumulating multi-platform solutions refined through historical experience, providing long-term consistency assurance.',
    },
  },
  Compatibility: {
    title: {
      zh: '前后向版本兼容',
      en: 'Forward and backward version compatibility',
    },
    description: {
      zh: '使用前端灵活部署的优势，让新特性、新引擎适配方案能够第一时间运行在更多平台版本上',
      en: 'The advantage of flexible deployment on the front end enables new features and new engine adaptation schemes to run on more platform versions at the first time.',
    },
  },
  ClearAPI: {
    title: {
      zh: '直观清晰的 API',
      en: 'Intuitive and clear APIs',
    },
    description: {
      zh: '不需要从 0 开始配置 x 元件的复杂属性',
      en: 'No need to write complex x elements from scratch',
    },
    details: {
      beforeFileName: {
        zh: '标准元件代码',
        en: 'Standard component code',
      },
      afterFileName: {
        zh: 'lynx-ui 代码',
        en: 'lynx-ui code',
      },
      beforeCode: `<list list-type="single"
      column-count={1}
      vertical-orientation

      android-new-scroll-top
      ios-scroll-emitter-helper
      android-enable-item-prefetch
      ios-fixed-content-offset
      component-init-measure
      android-trigger-sticky-layout
      use-old-sticky={false}
      lower-threshold={20}
      experimental-disable-filter-scroll
      experimental-disable-platform-implementation

      custom-list-name="list-container"
      enable-async-list
      ios-index-as-z-index
      scroll-bar-enable={false}
/>`,
      afterCode: `<List
      style={{ width: '100vw', height: '500px' }}
      listId='listBasic'
      listType='flow'
      spanCount={2}
      scrollOrientation='vertical'/>`,
    },
  },
  BestPractice: {
    title: {
      zh: '我们提供 Lynx 最佳实践',
      en: 'Best practices for Lynx',
    },
    description: {
      zh: '我们的代码将为你提供最好的 Lynx API 实践',
      en: 'We will provide you with the best practices for Lynx APIs.',
    },
  },
  Performance: {
    title: {
      zh: 'Lynx 的顶级性能实现',
      en: 'We provide a top-notch performance experience of Lynx',
    },
    description: {
      zh: '我们的代码将为你提供最好的 Lynx API 实践',
      en: 'We will provide you with the best practices for Lynx APIs.',
    },
  },
};
