// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import {
  PopoverContent,
  PopoverPositioner,
  PopoverRoot,
  PopoverTrigger,
} from '@lynx-js/lynx-ui';

import { EllipsisIcon, OptionsMenu } from '../shared/index.js';
import './index.css';

function App() {
  return (
    <view className="container lunaris-dark">
      <PopoverRoot
        onClose={() => console.info('dismissed!')}
        onOpen={() => console.info('shown!')}
      >
        <PopoverTrigger className="popover-trigger">
          <EllipsisIcon />
          <PopoverPositioner
            placement="bottom"
            placementOffset={12}
            crossAxisOffset={40}
            autoAdjust="shift"
            className="popover-positioner"
          >
            <PopoverContent className="popover-content">
              <OptionsMenu />
            </PopoverContent>
          </PopoverPositioner>
        </PopoverTrigger>
      </PopoverRoot>
    </view>
  );
}

root.render(<App />);

export default App;
