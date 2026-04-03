// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { Button } from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

import { Heart } from '../shared/Heart';

import './index.css';

function App() {
  return (
    <view className="container lunaris-dark luna-gradient-rose">
      <view className="canvas">
        <Button onClick={() => console.info('clicked')} className="button-root">
          {({ active = false }) => (
            <view className={clsx('button', { active: active })}>
              <text className="text">Button</text>
            </view>
          )}
        </Button>
        <Button className="button-root">
          {({ active = false }) => (
            <view className={clsx('button', { active: active })}>
              <Heart />
              <text className="text">Button</text>
            </view>
          )}
        </Button>
      </view>
    </view>
  );
}
root.render(<App />);
export default App;
