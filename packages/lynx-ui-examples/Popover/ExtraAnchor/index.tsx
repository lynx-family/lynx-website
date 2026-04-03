// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import {
  PopoverAnchor,
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
        </PopoverTrigger>
        <PopoverAnchor className="popover-anchor">
          <text className="popover-anchor-text">Anchor</text>
          <PopoverPositioner
            placement="bottom-start"
            placementOffset={12}
            autoAdjust="shift"
            className="popover-positioner"
          >
            <PopoverContent className="popover-content">
              {/* In ExtraAnchor scenario, PopoverContent is not wrapped by PopoverTrigger,
               *  so tap-to-close is not supported. Use a different description accordingly.
               */}
              <OptionsMenu description="Only the trigger dismisses this popover. Tapping the anchor or content has no effect." />
            </PopoverContent>
          </PopoverPositioner>
        </PopoverAnchor>
      </PopoverRoot>
    </view>
  );
}

root.render(<App />);

export default App;
