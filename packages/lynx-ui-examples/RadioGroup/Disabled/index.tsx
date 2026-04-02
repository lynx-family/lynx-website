// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';
import './index.css';

import {
  Button,
  Radio,
  RadioGroupRoot,
  RadioIndicator,
} from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

const HitSlop = {
  'hit-slop': {
    top: '8px' as `${number}px`,
    left: '8px' as `${number}px`,
    right: '8px' as `${number}px`,
    bottom: '8px' as `${number}px`,
  },
};

const radioTags = ['Dawn', 'Bloom', 'Glow', 'Fade', 'Rest'];

function App() {
  const [value, setValue] = useState(radioTags[0]);
  const [disabled, setDisabled] = useState(false);

  return (
    <view className="container lunaris-light luna-gradient-rose">
      <view className="canvas">
        <view className="section">
          <text className="label">
            Status: {disabled ? 'Disabled' : 'Enabled'}
          </text>
          <text className="label">Selected Value: {value}</text>
        </view>

        <view className="section">
          <RadioGroupRoot
            value={value}
            onValueChange={setValue}
            disabled={disabled}
          >
            <view className="radio-group-root">
              {radioTags.map((tag) => {
                const itemDisabled = tag === 'Glow'; // item-level disabled
                return (
                  <view key={tag} className="radio-option">
                    <Radio
                      className="radio-item"
                      value={tag}
                      disabled={itemDisabled}
                      radioProps={HitSlop}
                    >
                      <RadioIndicator className="radio-indicator">
                        <view className="radio-indicator-dot" />
                      </RadioIndicator>
                    </Radio>
                    <text
                      className={clsx(
                        'label',
                        (itemDisabled || disabled) && 'disabled',
                      )}
                    >
                      {tag}
                      {itemDisabled ? ' (disabled)' : ''}
                    </text>
                  </view>
                );
              })}
            </view>
          </RadioGroupRoot>
        </view>
        {/* toggle group disabled */}
        <view className="section">
          <Button className="button" onClick={() => setDisabled((v) => !v)}>
            <text>{disabled ? 'Enable group' : 'Disable group'}</text>
          </Button>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
