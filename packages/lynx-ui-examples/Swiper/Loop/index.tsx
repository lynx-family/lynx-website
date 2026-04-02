// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import { Swiper, SwiperItem } from '@lynx-js/lynx-ui';

import './styles.css';

const colorsArr: string[] = ['red', 'green', 'yellow', 'purple'];

function SwiperEntry() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const SwiperItemGap = 8;
  const screenWidth =
    lynx.__globalProps.screenWidth ??
    SystemInfo.pixelWidth / SystemInfo.pixelRatio;
  const containWidth = (screenWidth || 375) - SwiperItemGap * 2;
  const itemWidth = ((screenWidth || 375) / 375) * 315;

  console.log(
    'screenWidth, itemWidth, containWidth',
    screenWidth,
    itemWidth,
    containWidth,
  );
  return (
    <view>
      <Swiper
        data={colorsArr}
        itemWidth={itemWidth + SwiperItemGap}
        itemHeight={219.92727272727276}
        containerWidth={containWidth}
        loop={true}
        duration={500}
        initialIndex={0}
        mode="normal"
        autoPlay={true}
        onChange={setCurrentIndex}
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
      <view>
        <text>currentIndex: {currentIndex}</text>
      </view>
    </view>
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
