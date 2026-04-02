// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef } from '@lynx-js/react';

import { SwipeAction } from '@lynx-js/lynx-ui';
import type { SwipeActionRef } from '@lynx-js/lynx-ui';

import './index.css';

function App() {
  const swipeActionRef = useRef<SwipeActionRef>(null);
  const letters = ['L', 'Y', 'N', 'X', 'U', 'I', 'S', 'W', 'I', 'P', 'A', 'C'];
  const renderDisplayArea = (_letter: string) => (
    <view className="display-area-container">
      <view className="display-area-content" />
    </view>
  );
  const renderActionArea = () => (
    <view className="action-area-container">
      <view className="action-area-content" />
    </view>
  );

  return (
    <view className="app-container lunaris-dark">
      <scroll-view
        scroll-orientation="vertical"
        className="swipe-action-container"
      >
        {letters.map((letter) => (
          <SwipeAction
            className="swipe-action"
            key={letter}
            swipeActionId={letter}
            ref={swipeActionRef}
            enableSwipe={true}
            displayArea={renderDisplayArea(letter)}
            actionArea={renderActionArea()}
            onAction={(id: string) => {
              console.log('delete', id);
            }}
            onSwipeStart={(id: string) => {
              console.log('start', id);
            }}
            onSwipeEnd={(id: string) => {
              console.log('end', id);
            }}
          />
        ))}
      </scroll-view>
    </view>
  );
}

root.render(<App />);

export default App;
