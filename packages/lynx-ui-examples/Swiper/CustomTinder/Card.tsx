// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {} from '@lynx-js/react';
import './styles.css';

export function Card({ index }: { index: number }) {
  return (
    <view className="card">
      <text className="card-text">{index}</text>
      <text className="title">Swiper</text>
      <text className="subtitle">@lynx-js/lynx-ui</text>
    </view>
  );
}
