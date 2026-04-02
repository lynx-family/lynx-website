// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import { Checkbox, CheckboxIndicator } from '@lynx-js/lynx-ui';

import { CheckMark } from '../shared/Checkmark';
import './index.css';

const HitSlop = {
  'hit-slop': {
    top: '8px' as `${number}px`,
    left: '8px' as `${number}px`,
    right: '8px' as `${number}px`,
    bottom: '8px' as `${number}px`,
  },
};

function App() {
  const [checked, setChecked] = useState(false);

  return (
    <view className="container lunaris-dark luna-gradient-ocean">
      <view className="canvas">
        {/* Uncontrolled */}
        <view className="section">
          <text className="title">Uncontrolled</text>
          <view className="row">
            <Checkbox
              className="checkbox"
              onChange={(value) => console.log('Uncontrolled changed:', value)}
              checkboxProps={HitSlop}
            >
              <CheckboxIndicator className="checkbox-indicator">
                <CheckMark />
              </CheckboxIndicator>
            </Checkbox>
            <text>Uncontrolled Checkbox</text>
          </view>
        </view>

        {/* Controlled */}
        <view className="section">
          <text className="title">Controlled</text>
          <view className="row">
            <Checkbox
              className="checkbox"
              checked={checked}
              onChange={(value) => {
                console.log('Controlled changed:', value);
                setChecked(value);
              }}
              checkboxProps={HitSlop}
            >
              <CheckboxIndicator className="checkbox-indicator">
                <CheckMark />
              </CheckboxIndicator>
            </Checkbox>
            <text>{checked ? 'Checked' : 'Unchecked'}</text>
          </view>
        </view>

        {/* Disabled */}
        <view className="section">
          <text className="title">Disabled</text>
          <view className="row">
            <Checkbox disabled className="checkbox">
              <CheckboxIndicator className="checkbox-indicator">
                <CheckMark />
              </CheckboxIndicator>
            </Checkbox>
            <text className="label disabled">Disabled</text>
          </view>
          <view className="row">
            <Checkbox disabled checked className="checkbox">
              <CheckboxIndicator className="checkbox-indicator">
                <CheckMark />
              </CheckboxIndicator>
            </Checkbox>
            <text className="label disabled">Disabled & Checked</text>
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
