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
  ScrollView,
} from '@lynx-js/lynx-ui';

function App() {
  const handleDismissed = () => {
    console.log('dismissed!');
  };
  const handleShowed = () => {
    console.log('showed!');
  };
  const [show, setShow] = useState(false);
  return (
    <ScrollView scrollOrientation="vertical" className="scrollview">
      <view
        className="container"
        bindtap={() => {
          console.info('tap!');
        }}
      >
        <DialogRoot
          onClose={handleDismissed}
          onOpen={handleShowed}
          show={show}
          onShowChange={(show: boolean) => {
            setShow(show);
            console.info('showChange');
          }}
        >
          <DialogTrigger className="dialog-trigger">
            <text className="dialog-trigger-text">click to display dialog</text>
          </DialogTrigger>
          <DialogView className="dialog-viewport">
            <DialogBackdrop className="dialog-backdrop" />
            <DialogContent className="dialog-content animation">
              <view className="dialog-item">
                <text>Dialog Content</text>
              </view>
              <DialogClose className="dialog-close">
                <text style={{ color: 'white' }}>Close dialog</text>
              </DialogClose>
            </DialogContent>
          </DialogView>
        </DialogRoot>
      </view>
    </ScrollView>
  );
}

root.render(<App />);

export default App;
