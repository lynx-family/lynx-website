// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useRef, useState } from '@lynx-js/react';

import { Swiper, SwiperItem } from '@lynx-js/lynx-ui';
import type { SwiperRef } from '@lynx-js/lynx-ui';

import { Button } from '../Common/Button';
import { Card } from '../Common/Card';
import { Indicator } from '../Common/Indicator';

import './styles.css';

const itemArr: number[] = [1, 2, 3, 4, 5];

const itemWidths = [250, 350, 400];
const itemHeights = [200, 300, 350];
const alignArr: ['start', 'center', 'end'] = ['start', 'center', 'end'];

const INITIAL_INDEX = 2;

function SwiperEntry(): JSX.Element {
  const [itemWidthsIndex, _setItemWidthsIndex] = useState<number>(0);
  const [alignIndex, _setAlignIndex] = useState<number>(1);
  const [currentIndex, setCurrentIndex] = useState<number>(INITIAL_INDEX);
  const swiperRef = useRef<SwiperRef>(null);

  return (
    <view class="container lunaris-dark">
      <view class="top-area" />
      <view class="content-area">
        <Swiper
          ref={swiperRef}
          data={itemArr}
          itemWidth={itemWidths[itemWidthsIndex] ?? 0}
          containerWidth={
            lynx.__globalProps.screenWidth - 32 ||
            SystemInfo.pixelWidth / SystemInfo.pixelRatio - 32
          }
          duration={500}
          initialIndex={INITIAL_INDEX}
          onChange={setCurrentIndex}
          mode="normal"
          modeConfig={{
            align: alignArr[alignIndex],
            spaceBetween: 16,
          }}
          autoPlay={false}
          style={{
            overflow: 'visible',
          }}
          trackStyle={{
            alignItems: 'end',
          }}
        >
          {({ index, realIndex }) => (
            <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
              <Card
                index={realIndex}
                style={{
                  height: `${itemHeights[realIndex % itemHeights.length]}px`,
                }}
              />
            </SwiperItem>
          )}
        </Swiper>
        <Indicator current={currentIndex} count={itemArr.length} />
      </view>
      <view class="operation">
        <Button
          onClick={() => {
            swiperRef.current?.swipePrev();
          }}
          className="expand"
          text="SwipePrev"
        />
        <Button
          onClick={() => {
            swiperRef.current?.swipeNext();
          }}
          className="expand"
          type="primary"
          text="SwipeNext"
        />
      </view>
    </view>
  );
}

root.render(<SwiperEntry />);

export default SwiperEntry;
