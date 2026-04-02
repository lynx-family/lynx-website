// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef, useState } from '@lynx-js/react';

import { Button, SwipeAction } from '@lynx-js/lynx-ui';
import type { SwipeActionRef } from '@lynx-js/lynx-ui';

import './index.css';

function App() {
  const swipeActionRef = useRef<SwipeActionRef>(null);
  const [showAction, setShowAction] = useState<boolean>(false);
  const renderDisplayArea = () => (
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
      <view className="swipe-action-container">
        <SwipeAction
          className="swipe-action"
          swipeActionId="SwipeAction"
          ref={swipeActionRef}
          enableSwipe={true}
          displayArea={renderDisplayArea()}
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
      </view>
      <view className="button-container">
        <Button
          className="button"
          onClick={() => {
            if (showAction) {
              swipeActionRef.current?.closeActionArea(true);
            } else {
              swipeActionRef.current?.showActionArea(true);
            }
            setShowAction(!showAction);
          }}
        >
          <text className="button-text">
            {showAction ? 'Hide actionArea' : 'Show actionArea'}
          </text>
        </Button>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
