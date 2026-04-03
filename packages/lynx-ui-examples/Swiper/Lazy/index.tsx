// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { LazyComponent, Swiper, SwiperItem } from '@lynx-js/lynx-ui';

import './styles.css';

const colorsArr: string[] = [
  'red',
  'green',
  'yellow',
  'purple',
  'lightblue',
  'lightgreen',
  'lightyellow',
];

function SwiperEntry() {
  return (
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
          <view style="display: linear; linear-orientation: vertical; height: 100%; width: 30px; border: 1px solid #000;">
            <text style="color: #000">Show More</text>
          </view>
        ),
        onEndBounceItemBounce: ({ type }) => {
          console.log('onBounce result', type);
        },
      }}
    >
      {({ item, index, realIndex }) => (
        <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
          <LazyComponent
            scene="scene"
            pid={`pid_${realIndex}`}
            estimatedStyle={{ width: '100%', height: '100%' }}
          >
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
          </LazyComponent>
        </SwiperItem>
      )}
    </Swiper>
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
