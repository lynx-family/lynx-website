// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useCallback, useEffect, useRef, useState } from '@lynx-js/react';

import {
  Button,
  LazyComponent,
  ScrollView,
  invokeById,
} from '@lynx-js/lynx-ui';

import './index.css';

const restartDelay = 1000;
const itemCount = 30;

function Item({ isEnd }: { isEnd?: boolean }) {
  return (
    <view className={`item${isEnd ? ' item-end' : ''}`}>
      <text className="item-text">Item</text>
      {Array.from({ length: 5 }).map((_, index) => (
        <view className="item-sub-block" key={index} />
      ))}
    </view>
  );
}

function App() {
  const [mountEpoch, setMountEpoch] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restart = useCallback(() => {
    setMountEpoch((value) => value + 1);
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    void invokeById('scrollview1', 'autoScroll', {
      rate: 3000,
      start: false,
    }).catch(() => {
      /* empty */
    });
    void invokeById('scrollview2', 'autoScroll', {
      rate: 3000,
      start: false,
    }).catch(() => {
      /* empty */
    });

    void invokeById('scrollview1', 'scrollTo', {
      index: 0,
      offset: 0,
      smooth: false,
    }).catch(() => {
      /* empty */
    });
    void invokeById('scrollview2', 'scrollTo', {
      index: 0,
      offset: 0,
      smooth: false,
    }).catch(() => {
      /* empty */
    });

    timerRef.current = setTimeout(() => {
      void invokeById('scrollview1', 'autoScroll', {
        rate: 3000,
        start: true,
      }).catch(() => {
        /* empty */
      });
      void invokeById('scrollview2', 'autoScroll', {
        rate: 3000,
        start: true,
      }).catch(() => {
        /* empty */
      });
    }, restartDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [mountEpoch]);

  return (
    <view className="container lunaris-dark luna-gradient-berry">
      <view className="canvas">
        <view className="toolbar">
          <Button className="restart-button" onClick={restart}>
            <text className="restart-button-text">Run Again</text>
          </Button>
        </view>

        <text className="description">
          Compare LazyComponent visibility margin: the right column uses
          `bottom=200px`, so items mount up to 200px before entering the
          viewport.
        </text>

        <view className="columns">
          {/* Left */}
          <view className="column">
            <view className="info">
              <text>bottom: 0px (mount when visible)</text>
            </view>

            <ScrollView
              scrollviewId="scrollview1"
              scrollOrientation="vertical"
              lazyOptions={{ enableLazy: false }}
              className="scrollview"
            >
              {Array.from({ length: itemCount }).map((_, index) => (
                <LazyComponent
                  key={`${mountEpoch}_${index}`}
                  scene="scene_1"
                  pid={`pid_1_${index}`}
                  bottom="0px"
                  estimatedStyle={{ width: '100%', height: '300px' }}
                >
                  <Item isEnd={index === itemCount - 1} />
                </LazyComponent>
              ))}
            </ScrollView>
          </view>

          {/* Right */}
          <view className="column">
            <view className="info">
              <text>bottom: 200px (preload before visible)</text>
            </view>

            <ScrollView
              scrollviewId="scrollview2"
              scrollOrientation="vertical"
              lazyOptions={{ enableLazy: false }}
              className="scrollview"
            >
              {Array.from({ length: itemCount }).map((_, index) => (
                <LazyComponent
                  key={`${mountEpoch}_${index}`}
                  scene="scene_2"
                  pid={`pid_2_${index}`}
                  bottom="200px"
                  estimatedStyle={{ width: '100%', height: '300px' }}
                >
                  <Item isEnd={index === itemCount - 1} />
                </LazyComponent>
              ))}
            </ScrollView>
          </view>
        </view>
      </view>
    </view>
  );
}

root.render(<App />);

export default App;
