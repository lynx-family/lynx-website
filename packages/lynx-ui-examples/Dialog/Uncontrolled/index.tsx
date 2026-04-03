// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import './index.css';

import {
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTrigger,
  DialogView,
} from '@lynx-js/lynx-ui';
import type { PresenceAnimationStatus } from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

function App() {
  const handleDismissed = () => {
    console.log('dismissed!');
  };
  const handleShowed = () => {
    console.log('showed!');
  };
  return (
    <view className="container">
      <DialogRoot
        onClose={handleDismissed}
        onOpen={handleShowed}
        defaultShow={false}
      >
        {({
          leaving = false,
          entering = false,
          closed = false,
        }: PresenceAnimationStatus) => {
          return (
            <>
              <DialogTrigger>
                <view className="dialog-trigger">
                  <text className="dialog-trigger-text">open</text>
                </view>
              </DialogTrigger>
              <DialogView
                className={clsx('dialog-viewport', { closed: closed })}
              >
                <DialogBackdrop
                  className={clsx('dialog-backdrop', {
                    closed: closed,
                    'longer-fade-out': leaving,
                    'shorter-fade-in': entering,
                  })}
                />
                <DialogContent
                  className={clsx('dialog-content', {
                    closed: closed,
                    'shorter-fade-out': leaving,
                    'longer-fade-in': entering,
                  })}
                >
                  <view className="dialog-item">
                    <text>Dialog Content</text>
                  </view>
                  <DialogClose>
                    <view className="dialog-close">
                      <text style={{ color: 'white' }}>Close dialog</text>
                    </view>
                  </DialogClose>
                </DialogContent>
              </DialogView>
            </>
          );
        }}
      </DialogRoot>
    </view>
  );
}

root.render(<App />);

export default App;
