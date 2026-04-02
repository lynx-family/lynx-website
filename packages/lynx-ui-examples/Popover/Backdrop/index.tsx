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

import { EllipsisIcon, OptionsMenu } from '../shared/index.js';
import './index.css';

function App() {
  const [internalVisible, setInternalVisible] = useState(true);

  return (
    <view className="container lunaris-dark">
      <PopoverRoot
        show={internalVisible}
        onVisibleChange={(visible) => setInternalVisible(visible)}
      >
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
