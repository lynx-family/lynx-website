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
  const [show, setShow] = useState(true);

  return (
    <view className="container lunaris-dark">
      <DialogRoot
        onClose={handleDismissed}
        onOpen={handleShowed}
        show={show}
        onShowChange={setShow}
      >
        <DialogTrigger className="dialog-trigger">
          <text className="dialog-trigger-text">Show Dialog</text>
        </DialogTrigger>

        <DialogView className="dialog-viewport">
          <DialogBackdrop className="dialog-backdrop" />

          <DialogContent className="dialog-content">
            <view className="dialog-body">
              <text className="dialog-title">Step into the next phase</text>
              <text className="dialog-desc">
                This action will shift your current state. Nothing drastic, just
                a subtle drift, like moonlight sliding across a quiet surface.
              </text>
            </view>

            <DialogClose className="dialog-close">
              <text className="dialog-close-text">Proceed</text>
            </DialogClose>
          </DialogContent>
        </DialogView>
      </DialogRoot>
    </view>
  );
}

root.render(<App />);

export default App;
