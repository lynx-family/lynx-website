// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { root } from '@lynx-js/react';

import {
  Input,
  KeyboardAwareResponder,
  KeyboardAwareRoot,
  KeyboardAwareTrigger,
  TextArea,
} from '@lynx-js/lynx-ui';

import './index.css';

type Item = 'block' | 'input' | 'textarea';

const BLOCKS: Item[] = [
  ...Array.from({ length: 5 }, () => ['block', 'input'] as const).flat(),
  'block',
  'textarea',
  'block',
  'input',
];

function App() {
  return (
    <view className="container lunaris-dark luna-gradient-rose">
      <KeyboardAwareRoot androidStatusBarPlusBottomBarHeight={74}>
        <KeyboardAwareResponder as="ScrollView" className="canvas">
          {BLOCKS.map((item, index) => {
            if (item === 'input') {
              return (
                <KeyboardAwareTrigger key={`input-${index}`} offset={0}>
                  <view className="card">
                    <text className="label">Input</text>
                    <Input className="input" placeholder="Type here" />
                  </view>
                </KeyboardAwareTrigger>
              );
            }

            if (item === 'textarea') {
              return (
                <KeyboardAwareTrigger key={`textarea-${index}`} offset={0}>
                  <view className="card">
                    <text className="label">TextArea</text>
                    <view className="textarea-wrap">
                      <TextArea
                        className="textarea"
                        placeholder="Write something..."
                        maxLength={600}
                        maxLines={20}
                      />
                    </view>
                  </view>
                </KeyboardAwareTrigger>
              );
            }

            return <view key={`block-${index}`} className="block" />;
          })}
        </KeyboardAwareResponder>
      </KeyboardAwareRoot>
    </view>
  );
}

root.render(<App />);

export default App;
