// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { Swiper, SwiperItem } from '@lynx-js/lynx-ui';

import './styles.css';

const colorsArr: string[] = ['red', 'green', 'yellow', 'purple'];

function SwiperEntry() {
  return (
    <scroll-view scroll-y style="height: 230px">
      <view>
        <text>Test Swiper in scroll-view</text>
      </view>
      <Swiper
        data={colorsArr}
        itemWidth={250}
        itemHeight={200}
        loop={false}
        duration={500}
        initialIndex={0}
        mode="normal"
        modeConfig={{
          align: 'start',
        }}
        bounceConfig={{
          enable: true,
          startBounceItemWidth: 0,
          endBounceItem: (
            <view style="display: linear; linear-orientation: vertical; height: 100%; width: 30px;">
              <text>12345</text>
            </view>
          ),
          onEndBounceItemBounce: ({ type }) => {
            console.log('onBounce result', type);
          },
        }}
        experimentalHorizontalSwipeOnly={true}
      >
        {({ item, index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <view
              class="block-view"
              style={{
                width: '100%',
                height: '100%',
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
      <Swiper
        data={colorsArr}
        itemWidth={250}
        itemHeight={200}
        loop={false}
        duration={500}
        initialIndex={0}
        mode="normal"
        modeConfig={{
          align: 'start',
        }}
        bounceConfig={{
          enable: true,
          startBounceItemWidth: 0,
          endBounceItem: (
            <view style="display: linear; linear-orientation: vertical; height: 100%; width: 30px;">
              <text>12345</text>
            </view>
          ),
          onEndBounceItemBounce: ({ type }) => {
            console.log('onBounce result', type);
          },
        }}
        experimentalHorizontalSwipeOnly={true}
      >
        {({ item, index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <view
              class="block-view"
              style={{
                width: '100%',
                height: '100%',
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
    </scroll-view>
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
