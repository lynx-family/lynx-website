// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef } from '@lynx-js/react';

import {
  Swiper,
  SwiperItem,
  interpolate,
  interpolateJS,
} from '@lynx-js/lynx-ui';
import type { SwiperRef } from '@lynx-js/lynx-ui';

import './styles.css';

const colorsArr: string[] = ['red', 'green', 'yellow', 'purple'];

function customAnimation(value: number, _index: number) {
  'main thread';

  const scale = interpolate(value, [-1, 0, 1], [0.5, 1, 0.5]);

  return {
    transform: `scale(${scale})`,
  };
}

function customAnimationFirstScreen(value: number, _index: number) {
  const scale = interpolateJS(value, [-1, 0, 1], [0.5, 1, 0.5]);

  return {
    transform: `scale(${scale})`,
  };
}

function SwiperEntry(): JSX.Element {
  const swiperRef = useRef<SwiperRef>(null);

  return (
    <view id="container">
      <Swiper
        ref={swiperRef}
        data={colorsArr}
        itemWidth={250}
        duration={500}
        initialIndex={0}
        mode="normal"
        modeConfig={{
          align: 'center',
        }}
        main-thread:customAnimation={customAnimation}
        customAnimationFirstScreen={customAnimationFirstScreen}
      >
        {({ item, index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <view
              class="block-view"
              style={{
                width: '100%',
                height: '250px',
                backgroundColor: item,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <view
                style={{
                  backgroundColor: 'white',
                  width: '4px',
                  height: '4px',
                }}
              ></view>
            </view>
            <text class="image-text">Number.{index}</text>
          </SwiperItem>
        )}
      </Swiper>
    </view>
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
