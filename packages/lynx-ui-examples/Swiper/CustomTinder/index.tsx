// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import {
  Swiper,
  SwiperItem,
  interpolate,
  interpolateJS,
} from '@lynx-js/lynx-ui';

import { Card } from './Card';

import './styles.css';

const itemArr: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ITEM_WIDTH = 220;
const ITEM_HEIGHT = 330;

const customAnimation = (value: number) => {
  'main thread';
  const translateX = interpolate(value, [-1, 0], [-ITEM_WIDTH, 0], 'clamp');
  const translateY = interpolate(value, [0, 1], [0, -18], 'extend');
  const rotate = interpolate(value, [-1, 0], [-15, 0], 'clamp');
  const scale = interpolate(value, [0, 1], [1, 0.95], 'extend');
  const opacity = interpolate(value, [-1, -0.8, 0, 1], [0, 0.9, 1, 1], 'clamp');

  return {
    transform: `translate(${translateX}px, ${translateY}px) rotateZ(${rotate}deg) scale(${scale})`,
    opacity: opacity,
    'transform-origin': 'center',
  };
};

const customAnimationFirstScreen = (value: number, _index: number) => {
  const translateX = interpolateJS(value, [-1, 0], [-ITEM_WIDTH, 0], 'clamp');
  const translateY = interpolateJS(value, [0, 1], [0, -18], 'extend');
  const rotate = interpolateJS(value, [-1, 0], [-15, 0], 'clamp');
  const zIndex = interpolateJS(
    value,
    itemArr.map((_, index) => index),
    itemArr.map((_, index) => (itemArr.length - index) * 10),
    'extend',
  );

  const scale = interpolateJS(value, [0, 1, 0], [1, 0.95, 1], 'extend');
  const opacity = interpolateJS(
    value,
    [-1, -0.8, 0, 1],
    [0, 0.9, 1, 1],
    'clamp',
  );

  return {
    transform: `translate(${translateX}px, ${translateY}px) rotateZ(${rotate}deg) scale(${scale})`,
    opacity: opacity,
    'transform-origin': 'center',
    zIndex: zIndex,
  };
};

function SwiperEntry() {
  return (
    <view className="container lunaris-dark">
      <Swiper
        data={itemArr}
        itemWidth={ITEM_WIDTH}
        itemHeight={ITEM_HEIGHT}
        containerWidth={ITEM_WIDTH}
        duration={500}
        initialIndex={0}
        mode="custom"
        main-thread:customAnimation={customAnimation}
        customAnimationFirstScreen={customAnimationFirstScreen}
        style={{
          overflow: 'visible',
        }}
      >
        {({ index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <view
              class="block-view"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Card index={index} />
            </view>
          </SwiperItem>
        )}
      </Swiper>
    </view>
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
