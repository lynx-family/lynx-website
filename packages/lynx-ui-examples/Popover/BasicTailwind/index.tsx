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
import { clsx } from 'clsx';

import { OptionsMenu } from '../shared/index.js';

import './index.css';

function App() {
  return (
    <view className="lunaris-dark size-full pb-[160px] px-[48px] flex flex-col justify-center items-center bg-primary-muted">
      <PopoverRoot
        onClose={() => console.info('dismissed!')}
        onOpen={() => console.info('shown!')}
      >
        <PopoverTrigger className="trigger w-[168px] h-[48px] self-end flex flex-col justify-center items-center bg-primary rounded-[24px] transition-all ui-active:bg-primary-2">
          <text className="text-primary-content font-semibold text-base">
            Show Popover
          </text>
          <PopoverPositioner
            placement="bottom-end"
            placementOffset={12}
            autoAdjust="shift"
            className="w-max h-max"
          >
            <PopoverContent
              className={clsx(
                'flex flex-col items-start justify-start w-[264px] min-h-[192px] h-auto px-[36px] py-[24px] gap-[12px] rounded-[24px] bg-canvas shadow-lg',
                'ui-open:animate-popover-in ui-closed:animate-popover-out origin-top-right',
              )}
            >
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
