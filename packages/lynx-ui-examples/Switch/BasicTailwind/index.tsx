// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import { StyledSwitch } from './styled-switch';
import './index.css';

function App() {
  const [checked, setChecked] = useState(true);

  return (
    <view className="lunaris-dark luna-gradient-berry size-full flex flex-col justify-center px-[48px] py-[72px]">
      <view className="flex flex-col gap-[24px] px-[48px] py-[64px] rounded-[16px] overflow-hidden text-content bg-canvas">
        {/* Uncontrolled */}
        <view className="flex flex-col gap-[10px]">
          <view className="flex flex-row items-center justify-start gap-[16px] w-full">
            <StyledSwitch />
            <text className="text-lg text-content-2">Uncontrolled</text>
          </view>
        </view>

        {/* Controlled */}
        <view className="flex flex-col gap-[10px]">
          <view className="flex flex-row items-center justify-start gap-[16px] w-full">
            <StyledSwitch checked={checked} onChange={setChecked} />
            <text className="text-lg text-content-2">Controlled</text>
          </view>
        </view>

        {/* Disabled */}
        <view className="flex flex-col gap-[10px]">
          <view className="flex flex-row items-center justify-start gap-[16px] w-full shadow">
            <StyledSwitch disabled defaultChecked />
            <text className="text-lg text-content-2 opacity-40">Disabled</text>
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
