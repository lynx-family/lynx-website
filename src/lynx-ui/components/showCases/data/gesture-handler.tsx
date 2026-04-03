// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import EcomLive from '@assets/Gesture/ecom_live.webp';
import Sku from '@assets/demos/sku.webp';
import Novel from '@assets/demos/novel.webp';
import { showCaseData } from '../showCaseData';

export const gestureHandlerData: showCaseData[] = [
  {
    title: '极速达电商直播',
    img: EcomLive,
    caseDescriptionZH: [
      '定制多个滚动容器的联动复杂效果',
      '灵活处理各个滚动容器的手势冲突',
    ],
    caseDescription: [
      'Customize complex linked effects for multiple scroll containers',
      'Flexibly handle gesture conflicts between different scroll containers',
    ],
  },
  {
    title: '懂车帝车辆详情页',
    img: Sku,
    caseDescriptionZH: [
      '实现了吸顶元素自定义',
      '实现了类似于 FoldView 嵌套 FoldView 的效果',
    ],
    caseDescription: [
      'Implemented custom sticky elements',
      'Achieved effects similar to FoldView nesting within FoldView',
    ],
  },
  {
    title: '番茄小说推荐榜',
    img: Novel,
    caseDescriptionZH: [
      '实现了 foldview-slot 中存在左右两个滚动容器，且都需要联动 header 进行折叠和展开',
    ],
    caseDescription: [
      'Implemented foldview-slot with two scroll containers on the left and right, both needing to interact with the header for folding and unfolding.',
    ],
  },
];
