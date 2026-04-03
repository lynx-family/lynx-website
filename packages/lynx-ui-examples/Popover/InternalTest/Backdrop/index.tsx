// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import {
  PopoverBackdrop,
  PopoverContent,
  PopoverPositioner,
  PopoverRoot,
  PopoverTrigger,
} from '@lynx-js/lynx-ui';

import { EllipsisIcon, OptionsMenu } from '../../shared/index.js';
import './index.css';

function App() {
  return (
    <view className="container lunaris-dark">
      {/*
        Known issue (Popover Backdrop in uncontrolled mode):
        - When PopoverBackdrop/PopoverPositioner are nested inside PopoverTrigger, tapping the backdrop can bubble to the trigger.
        - Uncontrolled (`defaultShow`) may end up toggling twice (close then re-open), so the popover doesn't close cleanly.
        - Observed: iOS cannot close via backdrop; Android may close-open-close.
        Workaround: use controlled mode (`show` + `onVisibleChange`) until the upstream fix lands.
        Tracking issue: lynx-family/lynx-ui#84
      */}
      <PopoverRoot defaultShow={true}>
        <PopoverTrigger className="popover-trigger">
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
                <OptionsMenu description="Moments persist. Actions are transient. Tap outside to close." />
              </PopoverContent>
            </>
          </PopoverPositioner>
        </PopoverTrigger>
      </PopoverRoot>
    </view>
  );
}

root.render(<App />);

export default App;
