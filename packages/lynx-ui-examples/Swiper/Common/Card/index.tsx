// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {} from '@lynx-js/react';
import type { CSSProperties } from '@lynx-js/types';
import './styles.css';

export function Card({
  index,
  style,
}: {
  index: number;
  style?: CSSProperties;
}) {
  return (
    <view className="card" style={style}>
      <text className="card-text">{index}</text>
    </view>
  );
}
