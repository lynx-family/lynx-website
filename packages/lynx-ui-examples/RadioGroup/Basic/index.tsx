// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import { Radio, RadioGroupRoot, RadioIndicator } from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';
import './index.css';

const HitSlop = {
  'hit-slop': {
    top: '8px' as `${number}px`,
    left: '8px' as `${number}px`,
    right: '8px' as `${number}px`,
    bottom: '8px' as `${number}px`,
  },
};

const radioTags = ['lunaris-dark', 'lunaris-light', 'luna-dark', 'luna-light'];

function App() {
  const [value, setValue] = useState(radioTags[0]);

  return (
    <view className={clsx('container luna-gradient-rose', value)}>
      <view className="canvas">
        <RadioGroupRoot value={value} onValueChange={setValue}>
          <view className="radio-group-root">
            {radioTags.map((tag) => (
              <view key={tag} className="radio-option">
                <Radio className="radio-item" value={tag} radioProps={HitSlop}>
                  <RadioIndicator className="radio-indicator">
                    <view className="radio-indicator-dot" />
                  </RadioIndicator>
                </Radio>
                <text className="label">{tag}</text>
              </view>
            ))}
          </view>
        </RadioGroupRoot>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
