// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useEffect, useState } from '@lynx-js/react';

import {
  PopoverBackdrop,
  PopoverContent,
  PopoverPositioner,
  PopoverRoot,
  PopoverTrigger,
} from '@lynx-js/lynx-ui';

import { OptionsMenu } from '../../shared/index.js';
import './index.css';

const flipDuration = 10; // Trigger toggle in 10ms (less than 8 frames ~ 130ms)

function App() {
  const [internalVisibleControlled, setInternalVisibleControlled] =
    useState(false);

  useEffect(() => {
    // Simulate rapid open -> close
    // This should reproduce the issue where mount remains true if closed before Entering starts
    const timer = setTimeout(() => {
      console.log('Toggling ON');
      setInternalVisibleControlled(true);

      setTimeout(() => {
        console.log('Toggling OFF rapidly');
        setInternalVisibleControlled(false);
      }, flipDuration);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <view className="container lunaris-dark">
      <PopoverRoot
        show={internalVisibleControlled}
        onVisibleChange={setInternalVisibleControlled}
        debugLog={true} // Enable debug log to observe state transitions
      >
        <view className="info-panel">
          <text className="info-panel-text">
            Status: {internalVisibleControlled ? 'Visible' : 'Hidden'}
          </text>

          <text className="fast-toggle-note">
            Check console logs for [lynx-ui-presence] messages. If bug exists:
            mount stays true after toggle off.
          </text>
          <PopoverTrigger className="popover-trigger">
            <text className="popover-trigger-text">
              Fast Toggle Test ({flipDuration}ms)
            </text>
            <PopoverPositioner
              placement="bottom"
              placementOffset={12}
              autoAdjust="shift"
              className="popover-positioner"
              transition={true}
            >
              <>
                <PopoverBackdrop className="popover-backdrop" />
                <PopoverContent className="popover-content">
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
