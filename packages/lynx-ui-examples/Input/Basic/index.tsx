// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef, useState } from '@lynx-js/react';

import { Input, TextArea } from '@lynx-js/lynx-ui';
import type { InputRef } from '@lynx-js/lynx-ui';

import './index.css';

function App() {
  const controlledInputRef = useRef<InputRef>(null);
  const uncontrolledInputRef = useRef<InputRef>(null);

  const [controlledValue, setControlledValue] =
    useState<string>('controlledValue');
  const uncontrolledValueRef = useRef<string>('uncontrolledValue');

  return (
    <view className="container lunaris-dark luna-gradient-rose">
      <view className="canvas">
        {/* Input */}
        <view className="section">
          <text className="title">Input</text>

          <view className="field">
            <text className="label">Basic</text>
            <Input className="input" placeholder="Type here" />
          </view>

          <view className="field">
            <text className="label">Uncontrolled</text>
            <Input
              ref={uncontrolledInputRef}
              className="input"
              placeholder="Uncontrolled"
              defaultValue={uncontrolledValueRef.current}
            />
          </view>

          <view className="field">
            <text className="label">Controlled</text>
            <Input
              ref={controlledInputRef}
              className="input"
              placeholder="Controlled"
              value={controlledValue}
              onInput={setControlledValue}
            />
          </view>
        </view>

        {/* TextArea */}
        <view className="section">
          <text className="title">TextArea</text>

          <view className="textarea-wrap">
            <TextArea className="textarea" placeholder="Write something..." />
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
