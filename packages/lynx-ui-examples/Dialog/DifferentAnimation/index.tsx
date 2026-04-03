// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

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

// This demo is shown how to use different animation in entering and leaving.
// In this demo, we use shorter fade in animation when dialog is shown, and longer fade out animation when dialog is dismissed.

function App() {
  const handleDismissed = () => {
    console.log('dismissed!');
  };
  const handleShowed = () => {
    console.log('showed!');
  };
  const [show, setShow] = useState(false);
  return (
    <view className="container">
      <DialogRoot
        onClose={handleDismissed}
        onOpen={handleShowed}
        show={show}
        onShowChange={(show: boolean) => {
          setShow(show);
        }}
      >
        {({
          leaving = false,
          entering = false,
          closed = false,
          open = false,
        }: PresenceAnimationStatus) => {
          return (
            <>
              <DialogTrigger className="dialog-trigger">
                <text className="dialog-trigger-text">
                  click to display dialog
                </text>
              </DialogTrigger>
              <DialogView
                className={clsx('dialog-viewport', {
                  closed: closed,
                  open: open,
                })}
              >
                <DialogBackdrop
                  className={clsx('dialog-backdrop', {
                    'longer-fade-out': leaving,
                    'shorter-fade-in': entering,
                  })}
                />
                <DialogContent
                  className={clsx('dialog-content', {
                    'shorter-fade-out': leaving,
                    'longer-fade-in': entering,
                  })}
                >
                  <view className="dialog-item">
                    <text>Dialog Content</text>
                  </view>
                  <DialogClose className="dialog-close">
                    <text style={{ color: 'white' }}>Close dialog</text>
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
