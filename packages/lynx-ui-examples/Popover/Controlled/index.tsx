// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useEffect, useState } from '@lynx-js/react';

import {
  PopoverAnchor,
  PopoverBackdrop,
  PopoverContent,
  PopoverPositioner,
  PopoverRoot,
} from '@lynx-js/lynx-ui';

import { EllipsisIcon, OptionsMenu } from '../shared/index.js';
import './index.css';

const flipDuration = 2000;

function App() {
  const [internalVisibleControlled, setInternalVisibleControlled] =
    useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setInternalVisibleControlled((pre) => !pre);
    }, flipDuration);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <view className="container lunaris-dark">
      <PopoverRoot
        show={internalVisibleControlled}
        onVisibleChange={setInternalVisibleControlled}
      >
        <view className="info-panel">
          <text className="info-panel-text">
            Visible changed to {internalVisibleControlled ? 'true' : 'false'} in
            every {flipDuration}ms
          </text>

          {/* use trigger style but function as an anchor */}
          <PopoverAnchor className="popover-trigger">
            <EllipsisIcon />
            <PopoverPositioner
              placement="bottom"
              placementOffset={12}
              autoAdjust="shift"
              className="popover-positioner"
            >
              <>
                <PopoverBackdrop className="popover-backdrop" />
                <PopoverContent className="popover-content">
                  <OptionsMenu description="Moments persist. Actions are transient." />
                </PopoverContent>
              </>
            </PopoverPositioner>
          </PopoverAnchor>
        </view>
      </PopoverRoot>
    </view>
  );
}

root.render(<App />);

export default App;
