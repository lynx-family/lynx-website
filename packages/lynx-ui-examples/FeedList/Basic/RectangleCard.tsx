// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.css';

interface RectangleCardProps {
  cardKey: string;
  letter: string;
  height: number;
}
export function RectangleCard(props: RectangleCardProps) {
  const { letter, height = 422 } = props;
  return (
    <view style={{ width: '100%', height: 'max-content' }}>
      <view className="rectangle-card" style={{ height: `${height}px` }}>
        <text className="rectangle-card__letter">{letter}</text>
        <text className="rectangle-card__title">FeedList</text>
        <text className="rectangle-card__subtitle">@lynx-js/lynx-ui</text>
      </view>
    </view>
  );
}
