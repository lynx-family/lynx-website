// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import FeedListRefresh from '@assets/demos/FeedListRefresh.webp';
import FeedListFooter from '@assets/FeedListDemo/FeedListFooter.gif';
import GalleryComplete from '@assets/demos/galleryComplete.webp';
import { showCaseData } from '../showCaseData';

export const listData: showCaseData[] = [
  {
    title: '<FeedList>',
    img: FeedListRefresh,
    caseDescriptionZH: ['可支持多端对齐的刷新'],
    caseDescription: ['Supports multi-platform consistent refresh'],
  },
  {
    title: '<FeedList>',
    img: FeedListFooter,
    caseDescription: ['Supports footer with two states'],
    caseDescriptionZH: ['支持两种状态的 footer'],
  },
  {
    title: '<List>',
    img: GalleryComplete,
    caseDescriptionZH: ['适配多种排版策略'],
    caseDescription: ['multiple layout strategies'],
  },
];
