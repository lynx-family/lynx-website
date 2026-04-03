// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef, useState } from '@lynx-js/react';

import { Swiper, SwiperItem } from '@lynx-js/lynx-ui';
import type { SwiperRef } from '@lynx-js/lynx-ui';

import './styles.css';

import { Button } from './Button';

const DEFAULT_COLORS_ARR: string[] = [
  'red',
  'green',
  'yellow',
  'purple',
  'lightgreen',
  'lightyellow',
  'lightblue',
  'gray',
];

const itemWidths = [250, 350, 400];
const alignArr: ['start', 'center', 'end'] = ['start', 'center', 'end'];

function SwiperEntry(): JSX.Element {
  const [itemWidthsIndex, setItemWidthsIndex] = useState<number>(0);
  const [alignIndex, setAlignIndex] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const swiperRef = useRef<SwiperRef>(null);
  const [colorsArr, _setColorsArr] = useState<string[]>(DEFAULT_COLORS_ARR);

  return (
    <view id="container">
      <Swiper
        ref={swiperRef}
        data={colorsArr}
        itemWidth={itemWidths[itemWidthsIndex] ?? 0}
        itemHeight={200}
        duration={500}
        initialIndex={0}
        onChange={setCurrentIndex}
        mode="normal"
        loop={false}
        autoPlay={true}
        modeConfig={{
          align: alignArr[alignIndex] ?? 'start',
          spaceBetween: 10,
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
      <view class="operation">
        <view class="block">
          <text>Current Index: {currentIndex}</text>
        </view>
        <Button
          onClick={() => {
            swiperRef.current?.swipePrev();
          }}
          text="SwipePrev"
        ></Button>
        <Button
          onClick={() => {
            swiperRef.current?.swipeNext();
          }}
          text="SwipeNext"
        ></Button>
        <Button
          onClick={() => {
            setItemWidthsIndex((prev) => (prev + 1) % itemWidths.length);
          }}
          text={`itemWidth: ${itemWidths[itemWidthsIndex]}`}
        ></Button>
        <Button
          onClick={() => {
            setAlignIndex((prev) => (prev + 1) % itemWidths.length);
          }}
          text={`alignType: ${alignArr[alignIndex]}`}
        ></Button>
      </view>
    </view>
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
