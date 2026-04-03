// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import Popup1 from '@assets/Popup/popup-1.webp';
import Popup2 from '@assets/Popup/popup-2.webp';
import Popup3 from '@assets/Popup/popup-3.webp';
import { showCaseData } from '../showCaseData';

export const popupOnlineData: showCaseData[] = [
  {
    title: '<Popup>',
    img: Popup1,
    caseDescriptionZH: ['财经支付亲情卡页面'],
    caseDescription: ['Financial payment.'],
  },
  {
    title: '<Popup>',
    img: Popup2,
    caseDescriptionZH: [
      '直播会员页，类似于前面提到的七分屏的效果，它实现了惯性滚动的无缝衔接',
    ],
    caseDescription: [
      'The live-streaming membership page, similar to the effect of the 70% screen mentioned before, achieves seamless connection of inertial scrolling.',
    ],
  },
  {
    title: '<Popup>',
    img: Popup3,
    caseDescriptionZH: [
      '春节活动的聊天开红包页面，实现了Popup + Bounces 的效果',
    ],
    caseDescription: [
      'The red-envelope page of the Spring Festival event has achieved the effect of Popup + Bounces.',
    ],
  },
];
