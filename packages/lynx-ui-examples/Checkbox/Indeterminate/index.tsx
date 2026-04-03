// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import { Checkbox, CheckboxIndicator } from '@lynx-js/lynx-ui';

import { CheckMark } from '../shared/Checkmark';
import './index.css';

const FRUITS = ['Apple', 'Banana', 'Orange'];

const HitSlop = {
  'hit-slop': {
    top: '8px' as `${number}px`,
    left: '8px' as `${number}px`,
    right: '8px' as `${number}px`,
    bottom: '8px' as `${number}px`,
  },
};

function IndeterminateMark() {
  return <view className="indeterminate-mark" />;
}

function App() {
  const [selected, setSelected] = useState<string[]>([FRUITS[0]]);

  const allSelected = selected.length === FRUITS.length;
  const noneSelected = selected.length === 0;
  const indeterminate = !noneSelected && !allSelected;

  const handleSelectAll = (checked: boolean) => {
    console.log('Select All changed:', checked);
    setSelected(checked ? FRUITS : []);
  };

  const handleItem = (item: string, checked: boolean) => {
    console.log(`Item "${item}" Changed:`, checked);
    setSelected((prev) => {
      if (checked) return prev.includes(item) ? prev : [...prev, item];
      return prev.filter((x) => x !== item);
    });
  };

  return (
    <view className="container lunaris-dark luna-gradient-ocean">
      <view className="canvas">
        <view className="section">
          <text className="title">Indeterminate</text>

          <view className="row">
            <Checkbox
              className="checkbox"
              checked={allSelected}
              indeterminate={indeterminate}
              onChange={handleSelectAll}
              checkboxProps={HitSlop}
            >
              <CheckboxIndicator className="checkbox-indicator">
                {indeterminate ? <IndeterminateMark /> : <CheckMark />}
              </CheckboxIndicator>
            </Checkbox>
            <text>Select All</text>
          </view>

          <view className="fruits">
            {FRUITS.map((fruit) => (
              <view key={fruit} className="row">
                <Checkbox
                  className="checkbox"
                  checked={selected.includes(fruit)}
                  onChange={(checked) => handleItem(fruit, checked)}
                  checkboxProps={HitSlop}
                >
                  <CheckboxIndicator className="checkbox-indicator">
                    <CheckMark />
                  </CheckboxIndicator>
                </Checkbox>
                <text>{fruit}</text>
              </view>
            ))}
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
