// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import {
  PopoverBackdrop,
  PopoverContent,
  PopoverPositioner,
  PopoverRoot,
  PopoverTrigger,
} from '@lynx-js/lynx-ui';

import { OptionsMenu } from '../../shared/index.js';
import './index.css';

function App() {
  const [show, setShow] = useState(false);
  const [animationClass, setAnimationClass] = useState('popover-content');
  const [running, setRunning] = useState(false);

  const handleStartTest = () => {
    if (running) {
      return;
    }
    setRunning(true);
    // 1. Show the popover (starts entering animation)
    setShow(true);
    setAnimationClass('popover-content');

    // 2. Force animation cancel by changing animation class during animation
    setTimeout(() => {
      console.log('Changing animation class to trigger animation cancel');
      setAnimationClass('popover-content-alt');

      // 3. After a while, try to close popover
      setTimeout(() => {
        console.log('Now try to close popover');
        setShow(false);
        setRunning(false);
      }, 1000);
    }, 300); // Trigger mid-animation (assuming 300ms duration)
  };

  return (
    <view className="container lunaris-dark">
      <PopoverRoot show={show} onVisibleChange={setShow} debugLog={true}>
        <view className="info-panel">
          <text className="info-panel-text">
            Status: {show ? 'Visible' : 'Hidden'}
          </text>

          <text className="animation-cancel-note">
            Scenario: Change animation class during enter animation -&gt;
            triggers cancel. If bug exists: state might stall in
            Entering/Leaving because cancel didn't trigger completion logic.
          </text>

          <PopoverTrigger
            className="popover-trigger"
            onClick={handleStartTest}
            disabled={running}
          >
            <text className="popover-trigger-text">Animation Cancel Test</text>
            <PopoverPositioner
              placement="bottom"
              placementOffset={12}
              autoAdjust="shift"
              className="popover-positioner"
              transition={true}
            >
              <>
                <PopoverBackdrop
                  className="popover-backdrop"
                  transition={true}
                />
                <PopoverContent transition={true} className={animationClass}>
                  <OptionsMenu />
                </PopoverContent>
              </>
            </PopoverPositioner>
          </PopoverTrigger>
        </view>
      </PopoverRoot>
    </view>
  );
}

root.render(<App />);

export default App;
