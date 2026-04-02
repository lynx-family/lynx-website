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

function App() {
  const handleDismissed = () => {
    console.log('dismissed!');
  };
  const handleShowed = () => {
    console.log('showed!');
  };
  const [showLevel3, setShowLevel3] = useState(false);
  const [showLevel4, setShowLevel4] = useState(false);
  return (
    <view className="container">
      <DialogRoot
        onClose={handleDismissed}
        onOpen={handleShowed}
        show={showLevel3}
        onShowChange={(show: boolean) => {
          setShowLevel3(show);
        }}
      >
        <DialogTrigger className="dialog-trigger">
          <text className="dialog-trigger-text">
            click to display dialog in level 3
          </text>
        </DialogTrigger>
        <DialogView className="dialog-viewport" overlayLevel={3}>
          <DialogBackdrop className="dialog-backdrop" />
          <DialogContent className="dialog-content animation level-3">
            <view className="dialog-item">
              <text>Dialog Content 3</text>
            </view>
            <DialogClose className="dialog-close">
              <text style={{ color: 'white' }}>Close dialog</text>
            </DialogClose>
          </DialogContent>
        </DialogView>

        {/* This dialog is non modal, it will not block the higher level dialogs */}
      </DialogRoot>
      <DialogRoot
        onClose={handleDismissed}
        onOpen={handleShowed}
        show={showLevel4}
        onShowChange={(show: boolean) => {
          setShowLevel4(show);
        }}
      >
        <DialogTrigger className="dialog-trigger">
          <text className="dialog-trigger-text">
            click to display dialog in level 4
          </text>
        </DialogTrigger>
        <DialogView className="dialog-viewport-level-3" overlayLevel={4}>
          <DialogContent className="dialog-content animation level-4">
            <view className="dialog-item">
              <text>Dialog Content 4</text>
            </view>
            <DialogClose className="dialog-close">
              <text style={{ color: 'white' }}>Close dialog</text>
            </DialogClose>
          </DialogContent>
        </DialogView>
      </DialogRoot>
    </view>
  );
}

root.render(<App />);

export default App;
