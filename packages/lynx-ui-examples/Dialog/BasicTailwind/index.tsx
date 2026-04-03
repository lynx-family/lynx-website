// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import {
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTrigger,
  DialogView,
} from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

import './index.css';

function App() {
  const handleDismissed = () => {
    console.log('dismissed!');
  };
  const handleShowed = () => {
    console.log('showed!');
  };
  const [show, setShow] = useState(true);

  return (
    <view className="lunaris-dark bg-primary-muted size-full flex flex-col items-center justify-center">
      <DialogRoot
        onClose={handleDismissed}
        onOpen={handleShowed}
        show={show}
        onShowChange={setShow}
      >
        <DialogTrigger
          className={clsx(
            'w-[240px] h-[48px] flex justify-center items-center rounded-full',
            'bg-neutral active:bg-neutral-2 transition-colors',
          )}
        >
          <text className="text-neutral-content font-semibold text-base">
            Show Dialog
          </text>
        </DialogTrigger>
        <DialogView className="absolute size-full flex flex-col items-center justify-center px-[24px] overflow-hidden">
          <DialogBackdrop
            className={clsx(
              'bg-backdrop ui-open:opacity-100 ui-closed:opacity-0',
              'transition-opacity duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
            )}
          />
          <DialogContent
            className={clsx(
              'w-full flex flex-col items-center p-[24px] rounded-[24px]',
              'bg-canvas border-line border',
              'ui-open:opacity-100 ui-closed:opacity-0 ',
              'transition-opacity duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
            )}
          >
            <view className="w-full h-[250px] flex flex-col items-start justify-center px-[32px] gap-[12px]">
              <text className="text-content text-lg font-semibold">
                Step into the next phase
              </text>
              <text className="text-content-muted text-base">
                This action will shift your current state. Nothing drastic, just
                a subtle drift, like moonlight sliding across a quiet surface.
              </text>
            </view>
            <DialogClose
              className={clsx(
                'w-4/5 h-[48px] flex justify-center items-center rounded-full',
                'bg-primary ui-active:bg-primary-2 transition-colors',
              )}
            >
              <text className="text-primary-content font-semibold text-base">
                Proceed
              </text>
            </DialogClose>
          </DialogContent>
        </DialogView>
      </DialogRoot>
    </view>
  );
}

root.render(<App />);

export default App;
