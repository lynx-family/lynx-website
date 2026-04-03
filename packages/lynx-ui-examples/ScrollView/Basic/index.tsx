// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { ScrollView } from '@lynx-js/lynx-ui';

import { CircleLetterCard } from './CircleLetterCard';
import './index.css';

const LETTERS = ['L', 'Y', 'N', 'X', 'U', 'I', 'L', 'Y', 'N', 'X', 'J', 'S'];

function App() {
  return (
    <view className="container lunaris-dark">
      <ScrollView scrollOrientation="horizontal" className="scroll-view">
        <view className="scroll-view-content">
          {LETTERS.map((letter, i) => (
            <CircleLetterCard letter={letter} key={`circle-${i}`} />
          ))}
        </view>
      </ScrollView>
    </view>
  );
}

root.render(<App />);

export default App;
