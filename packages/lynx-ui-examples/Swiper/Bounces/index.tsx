// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { Swiper, SwiperItem } from '@lynx-js/lynx-ui';

import './styles.css';

const colorsArr: string[] = ['red', 'green', 'yellow', 'purple'];

function SwiperEntry() {
  return (
    <Swiper
      data={colorsArr}
      itemWidth={250}
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
        endBounceItemWidth: 100,
        endBounceItem: (
          <view style="display: linear; linear-orientation: vertical; height: 100%; width: 30px; border: 1px solid #000;">
            <text style="color: #000">Show More</text>
          </view>
        ),
        onEndBounceItemBounce: ({ type }) => {
          console.log('onBounce result', type);
        },
      }}
      onChange={(index) => {
        console.log('onChange', index);
      }}
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
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
