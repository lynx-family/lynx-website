// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import SwiperSpringFestival from '@assets/swiperSpringFestival.gif';
import SwiperAnimation from '@assets/swiperAnimation.gif';
import { showCaseData } from '../showCaseData';

export const swiperData: showCaseData[] = [
  {
    title: '<Swiper>',
    img: SwiperSpringFestival,
    caseDescriptionZH: [
      '春节活动使用的红包卡面',
      '利用 `customAnimation` 实现流畅的跟随滚动的动效',
    ],
    caseDescription: [
      'Red pocket component in Spring Festival page',
      ' Use customAnimation to implement smooth animation',
    ],
  },
  {
    title: '<Swiper>',
    img: SwiperAnimation,
    caseDescriptionZH: [
      'Tinder-Like App',
      '左划卡片飞出',
      '使用 10 行左右的 MTS 函数即可实现自定义效果',
    ],
    caseDescription: [
      'Tinder-Like App',
      ' swipes left and flies out',
      '10 lines of MTS functions',
    ],
  },
];
