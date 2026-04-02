// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.css';

interface ListItemCardProps {
  letter: string;
  height?: number;
}

export function ListItemCard(props: ListItemCardProps) {
  const { letter, height = 422 } = props;
  return (
    <view className="list-item-card-container">
      <view className="list-item-card" style={{ height: `${height}px` }}>
        <view className="list-item-card-center">
          <text className="list-item-card__letter">{letter}</text>
          <view className="list-item-card-meta">
            <text className="list-item-card__title">List</text>
            <text className="list-item-card__subtitle">@lynx-js/lynx-ui</text>
          </view>
        </view>
      </view>
    </view>
  );
}
