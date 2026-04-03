// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import type { ReactNode } from '@lynx-js/react';
import './index.css';

interface CircleLetterCardProps {
  letter: string;
}

export const CircleLetterCard = (props: CircleLetterCardProps): ReactNode => {
  const { letter } = props;
  return (
    <view className="card">
      <view className="circle">
        <text className="letter">{letter}</text>
        <text className="title">ScrollView</text>
        <text className="subtitle">@lynx-js/lynx-ui</text>
      </view>
    </view>
  );
};
