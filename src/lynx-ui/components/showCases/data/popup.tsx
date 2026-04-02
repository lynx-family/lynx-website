// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { showCaseData } from '../showCaseData';
import ProductDetail from '@assets/Popup/product_detail.jpeg';
import Tooltip from '@assets/Popup/tooltip.png';
import Popup from '@assets/demos/popup.webp';

export const popupData: showCaseData[] = [
  {
    title: `<ActionSheet>`,
    img: ProductDetail,
    caseDescriptionZH: [
      '从底部弹出动效的弹窗',
      '可自由定制弹窗样式、底部弹出动效',
    ],
    caseDescription: [
      'A bottom slide-up animation',
      'Free customization of styles and bottom slide-up animations',
    ],
  },
  {
    title: `<Tooltip>`,
    img: Tooltip,
    caseDescriptionZH: [
      '可以从页面任意位置弹出的弹窗',
      '可自行定制弹窗样式、弹窗位置',
    ],
    caseDescription: [
      'A tip window that can pop up from anywhere on the page',
      'customizable styles and positions',
    ],
  },
  {
    title: `<Popup>`,
    img: Popup,
    caseDescription: [
      'A draggable pop-up window',
      'Flexible position specification and hover animations',
      'Split drag zones and scroll zones',
    ],
    caseDescriptionZH: [
      '可拖拽的七分屏弹窗',
      '可灵活指定任意分屏位置以及渐入渐出、悬停动画',
      '区分拖拽区和滚动区',
    ],
  },
];
