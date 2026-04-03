// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef } from '@lynx-js/react';

import {
  Input,
  KeyboardAwareResponder,
  KeyboardAwareRoot,
  KeyboardAwareTrigger,
  TextArea,
} from '@lynx-js/lynx-ui';
import type { InputRef } from '@lynx-js/lynx-ui';

import './index.css';

function App() {
  const input2Ref = useRef<InputRef>(null);

  return (
    <view className="container lunaris-dark luna-gradient-rose">
      <KeyboardAwareRoot androidStatusBarPlusBottomBarHeight={74}>
        <KeyboardAwareResponder className="canvas" style={{ height: 'auto' }}>
          <view className="section">
            <text className="title">Keyboard Aware</text>
            <text className="subtitle">
              Type <text className="code">next</text> to jump focus.
            </text>
          </view>

          <KeyboardAwareTrigger offset={0}>
            <view className="card">
              <text className="label">Input 0</text>
              <Input
                className="input"
                placeholder="inputId: 'input0'"
                onInput={(value: string) => {
                  if (value === 'next') input2Ref.current?.focus();
                }}
              />
            </view>
          </KeyboardAwareTrigger>

          <KeyboardAwareTrigger>
            <view className="card">
              <text className="label">Input 1</text>
              <Input
                className="input"
                placeholder="Type 'next' to focus input2"
                onInput={(value: string) => {
                  if (value === 'next') input2Ref.current?.focus();
                }}
              />
            </view>
          </KeyboardAwareTrigger>

          <KeyboardAwareTrigger>
            <view className="card">
              <text className="label">Input 2</text>
              <Input ref={input2Ref} className="input" placeholder="Input" />
            </view>
          </KeyboardAwareTrigger>

          <KeyboardAwareTrigger offset={0}>
            <view className="card">
              <text className="label">TextArea</text>
              <view className="textarea-wrap">
                <TextArea
                  className="textarea"
                  placeholder="Write something..."
                />
              </view>
            </view>
          </KeyboardAwareTrigger>
        </KeyboardAwareResponder>
      </KeyboardAwareRoot>
    </view>
  );
}

root.render(<App />);

export default App;
