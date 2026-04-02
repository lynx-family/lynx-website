// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import { Button, LazyComponent } from '@lynx-js/lynx-ui';

import './index.css';

function Item() {
  return (
    <view
      native-interaction-enabled={false}
      user-interaction-enabled={false}
      className="lazy-item"
    >
      {/* Render many lightweight cells to emphasize mount/layout work and render timing (not paint). */}
      {Array.from({ length: 1000 }).map((_, index) => (
        <view key={index} flatten={false} className="lazy-item-cell" />
      ))}
    </view>
  );
}

function App() {
  const [lazyVisible, setLazyVisible] = useState<boolean>(false);
  const [nonLazyVisible, setNonLazyVisible] = useState<boolean>(false);

  return (
    <view className="container lunaris-dark luna-gradient-berry">
      <view className="canvas">
        <text className="description">
          Click the button. With 'Lazy', the solid block appears after the
          border. With 'Non-lazy', both appear at the same time.
        </text>
        <view className="panels">
          <view className="panel">
            <Button
              className="button"
              onClick={() => {
                setLazyVisible((v) => !v);
              }}
            >
              <text className="button-text">Lazy</text>
            </Button>

            {lazyVisible ? (
              <view className="preview">
                <LazyComponent
                  scene="scene"
                  pid="pid"
                  estimatedStyle={{ width: '100%', height: '100%' }}
                >
                  <Item />
                </LazyComponent>
              </view>
            ) : (
              <view className="preview preview-dimmed" />
            )}
          </view>

          <view className="panel">
            <Button
              className="button"
              onClick={() => {
                setNonLazyVisible((v) => !v);
              }}
            >
              <text className="button-text">Non-lazy</text>
            </Button>

            {nonLazyVisible ? (
              <view className="preview">
                <Item />
              </view>
            ) : (
              <view className="preview preview-dimmed" />
            )}
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
