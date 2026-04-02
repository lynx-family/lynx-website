// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { ScrollView } from '@lynx-js/lynx-ui';

import { FlexItemCard } from './FlexItemCard';

import './index.css';

const LETTERS = 'L Y N X U I R E A C T L Y N X'.split(' ');

// This example demonstrates how flex-grow consumes remaining space
// inside a scrollable content container.

function App() {
  return (
    <view className="container lunaris-dark">
      <ScrollView scrollOrientation="horizontal" className="scroll-view">
        <view className="scroll-view-content">
          <FlexItemCard variant="auto" />
          {LETTERS.map((letter, i) => (
            <FlexItemCard
              key={`${letter}-${i}`}
              letter={letter}
              variant="fixed"
            />
          ))}
        </view>
      </ScrollView>
    </view>
  );
}

root.render(<App />);

export default App;
