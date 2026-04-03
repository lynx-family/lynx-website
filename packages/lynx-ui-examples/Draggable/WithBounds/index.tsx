// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { Draggable } from '@lynx-js/lynx-ui';

import './index.css';

function App() {
  return (
    <view className="container lunaris-dark">
      <view className="draggable-area">
        <Draggable
          className="draggable"
          resetOnEnd={true}
          minTranslateX={-100}
          minTranslateY={-100}
          maxTranslateX={100}
          maxTranslateY={100}
          trigger="immediate"
        />
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
