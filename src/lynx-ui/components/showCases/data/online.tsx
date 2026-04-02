// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import Popup1 from '@assets/Popup/popup-1.webp';
import Popup2 from '@assets/Popup/popup-2.webp';
import Popup3 from '@assets/Popup/popup-3.webp';
import ActionSheet1 from '@assets/demos/action-sheet-1.webp';
import ViewPager1 from '@assets/demos/view-pager-1.webp';
import VideoEngine1 from '@assets/demos/video-engine-1.webp';
import { showCaseData } from '../showCaseData';

export const onlineData: showCaseData[] = [
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
  {
    title: '<ActionSheet>',
    img: ActionSheet1,
    caseDescriptionZH: [
      'Tiktok 圣诞活动音效选择面板，使用 ActionSheet 完成，自定义面板样式',
    ],
    caseDescription: [
      "The sound-effect selection panel for TikTok's Christmas event is completed using `<ActionSheet>`, and the panel style is customized.",
    ],
  },
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
  {
    title: '<VideoEngine>',
    img: VideoEngine1,
    caseDescriptionZH: [
      '懂车帝二手车搜索详情页，使用 VideoEngine 播放头图视频，数据源来自 video_model',
    ],
    caseDescription: [
      'On the search detail page of DCD, the head-picture video is played using VideoEngine, and the data source comes from video_model.',
    ],
  },
];
