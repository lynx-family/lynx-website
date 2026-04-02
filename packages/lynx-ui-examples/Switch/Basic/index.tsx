// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import { Switch, SwitchThumb, SwitchTrack } from '@lynx-js/lynx-ui';
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
  const [checked, setChecked] = useState(true);

  return (
    <view className="container lunaris-dark luna-gradient-berry">
      <view className="canvas">
        {/* Uncontrolled */}
        <view className="section">
          <view className="row">
            <Switch className="switch" switchProps={HitSlop}>
              <SwitchTrack className="switch-track" />
              <SwitchThumb className="switch-thumb" />
            </Switch>
            <text className="label">Uncontrolled</text>
          </view>
        </view>

        {/* Controlled */}
        <view className="section">
          <view className="row">
            <Switch
              className="switch"
              checked={checked}
              onChange={setChecked}
              switchProps={HitSlop}
            >
              <SwitchTrack className="switch-track" />
              <SwitchThumb className="switch-thumb" />
            </Switch>
            <text className="label">Controlled</text>
          </view>
        </view>

        {/* Disabled */}
        <view className="section">
          <view className="row">
            <Switch
              className="switch"
              disabled
              defaultChecked
              switchProps={HitSlop}
            >
              <SwitchTrack className="switch-track" />
              <SwitchThumb className="switch-thumb" />
            </Switch>
            <text className="label disabled">Disabled</text>
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
