// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useEffect, useState } from '@lynx-js/react';

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
  const [show, setShow] = useState(false);
  const [level, setLevel] = useState(2);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Changing overlayLevel from 2 to 3');
      setLevel(3);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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
        <DialogTrigger className="dialog-trigger">
          <text className="dialog-trigger-text">click to display dialog</text>
        </DialogTrigger>
        <DialogView
          className="dialog-viewport"
          container="window"
          overlayLevel={level}
        >
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
  );
}

root.render(<App />);

export default App;
