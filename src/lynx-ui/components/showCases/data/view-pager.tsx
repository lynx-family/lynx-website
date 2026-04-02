// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import ViewPager1 from '@assets/demos/view-pager-1.webp';
import { showCaseData } from '../showCaseData';

export const viewpagerData: showCaseData[] = [
  {
    title: '<ViewPager>',
    img: ViewPager1,
    caseDescriptionZH: [
      'Capcut 搜索结果页，通过监听 touchmove 对 Tabs + ViewPager Y轴方向做 transform 来完成滚动折叠效果',
    ],
    caseDescription: [
      'On the Capcut search results page, the scrolling and folding effect is achieved by monitoring touchmove to perform a transform on the Y-axis of Tabs + ViewPager.',
    ],
  },
];
