// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

/**
 * This example reproduces the "calcBounceOffset: invalid offset" error.
 *
 * The bug occurs when:
 * 1. Swiper is initialized with empty data (data=[])
 * 2. autoPlay is enabled
 * 3. Data is updated later
 *
 * Root cause: getCurrentIndex() returns NaN when dataCount is 0
 * because (x % 0) = NaN in JavaScript
 */

import { root, useEffect, useRef, useState } from '@lynx-js/react';

import { Swiper, SwiperItem } from '@lynx-js/lynx-ui';
import type { SwiperRef } from '@lynx-js/lynx-ui';

import { Button } from '../Common/Button';
import { Card } from '../Common/Card';

import './styles.css';

const DEFAULT_DATA: number[] = [1, 2, 3, 4, 5];

// Container padding (16px) + Section padding (16px) = 32px on each side = 64px total
const CONTAINER_PADDING = 64;
const getContainerWidth = () => {
  const screenWidth =
    lynx.__globalProps.screenWidth ??
    SystemInfo.pixelWidth / SystemInfo.pixelRatio;
  return screenWidth - CONTAINER_PADDING;
};

/**
 * Scenario 1: Empty data with autoPlay enabled
 * REPRODUCES: Swipe the empty swiper before data loads (within 1 second)
 * Result: Swiper shows wrong position (index -1, -2 loop placeholders instead of starting at 0)
 */
function EmptyDataWithAutoPlay(): JSX.Element {
  const [data, setData] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [onChangeLog, setOnChangeLog] = useState<string[]>([]);
  const swiperRef = useRef<SwiperRef>(null);

  const handleChange = (index: number) => {
    console.log('[Scenario 1] onChange:', index, 'isNaN:', isNaN(index));
    setCurrentIndex(index);
    setOnChangeLog((prev) => [
      ...prev.slice(-4),
      `onChange(${index}) ${isNaN(index) ? '⚠️ NaN!' : ''}`,
    ]);
  };

  const handleSwipeStop = (index: number) => {
    console.log('[Scenario 1] onSwipeStop:', index, 'isNaN:', isNaN(index));
    setOnChangeLog((prev) => [
      ...prev.slice(-4),
      `onSwipeStop(${index}) ${isNaN(index) ? '⚠️ NaN!' : ''}`,
    ]);
  };

  useEffect(() => {
    // Simulate async data loading
    // User should SWIPE before this timer fires to reproduce the bug
    setTimeout(() => {
      console.log('[Scenario 1] Loading data after 1 second...');
      setData(DEFAULT_DATA);
    }, 1000);
  }, []);

  return (
    <view class="section">
      <text class="title">
        Scenario 1: Empty Data + Swipe Before Load (REPRODUCES)
      </text>
      <text class="description">
        ⚠️ To reproduce: SWIPE the empty area within 1 second (before data
        loads). Result: Swiper shows wrong position (loop placeholders -1, -2
        visible instead of index 0)
      </text>
      <Swiper
        ref={swiperRef}
        data={data}
        containerWidth={getContainerWidth()}
        itemWidth={300}
        itemHeight={200}
        duration={500}
        initialIndex={0}
        onChange={handleChange}
        onSwipeStop={handleSwipeStop}
        mode="normal"
        loop={true}
        autoPlay={true}
        autoPlayInterval={2000}
        modeConfig={{ align: 'center' }}
      >
        {({ index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <Card index={realIndex} style={{ height: '200px' }} />
          </SwiperItem>
        )}
      </Swiper>
      <view class="info">
        <text>
          Current Index: {currentIndex} {isNaN(currentIndex) ? '⚠️ NaN!' : ''}
        </text>
        <text>Data Length: {data.length}</text>
        <text class="log-title">Callback Log:</text>
        {onChangeLog.map((log, i) => (
          <text key={i} class="log-item">
            {log}
          </text>
        ))}
      </view>
    </view>
  );
}

/**
 * Scenario 2: Empty data with swipe gesture
 * REPRODUCES: SWIPE the empty area, then click "Load Data"
 * Note: Just clicking SwipeNext button doesn't reproduce - must use swipe gesture
 * Observe: Visual shows wrong position, but callbacks report correct values
 */
function EmptyDataWithManualSwipe(): JSX.Element {
  const [data, setData] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [onChangeLog, setOnChangeLog] = useState<string[]>([]);
  const [swipeStartCount, setSwipeStartCount] = useState<number>(0);
  const [swipeStopCount, setSwipeStopCount] = useState<number>(0);
  const swiperRef = useRef<SwiperRef>(null);

  const handleChange = (index: number) => {
    console.log('[Scenario 2] onChange:', index, 'isNaN:', isNaN(index));
    setCurrentIndex(index);
    setOnChangeLog((prev) => [
      ...prev.slice(-4),
      `onChange(${index}) ${isNaN(index) ? '⚠️ NaN!' : ''}`,
    ]);
  };

  const handleSwipeStart = () => {
    console.log('[Scenario 2] onSwipeStart');
    setSwipeStartCount((prev) => prev + 1);
  };

  const handleSwipeStop = (index: number) => {
    console.log('[Scenario 2] onSwipeStop:', index, 'isNaN:', isNaN(index));
    setSwipeStopCount((prev) => prev + 1);
    setOnChangeLog((prev) => [
      ...prev.slice(-4),
      `onSwipeStop(${index}) ${isNaN(index) ? '⚠️ NaN!' : ''}`,
    ]);
  };

  return (
    <view class="section">
      <text class="title">
        Scenario 2: Empty Data + Swipe Gesture (REPRODUCES)
      </text>
      <text class="description">
        ⚠️ Steps to reproduce: 1) SWIPE the empty area (not just button click)
        2) Click "Load Data". Note: Callbacks report correct values, but visual
        is wrong.
      </text>
      <Swiper
        ref={swiperRef}
        data={data}
        containerWidth={getContainerWidth()}
        itemWidth={300}
        itemHeight={200}
        duration={500}
        mode="normal"
        loop={true}
        autoPlay={false}
        modeConfig={{ align: 'center' }}
        onChange={handleChange}
        onSwipeStart={handleSwipeStart}
        onSwipeStop={handleSwipeStop}
      >
        {({ index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <Card index={realIndex} style={{ height: '200px' }} />
          </SwiperItem>
        )}
      </Swiper>
      <view class="buttons">
        <Button
          onClick={() => {
            console.log('[Scenario 2] Calling swipeNext() on empty swiper');
            swiperRef.current?.swipeNext();
          }}
          text="1. SwipeNext (empty)"
        />
        <Button
          onClick={() => {
            console.log('[Scenario 2] Loading data...');
            setData(DEFAULT_DATA);
          }}
          text="2. Load Data"
          type="primary"
        />
        <Button
          onClick={() => {
            setData([]);
            setOnChangeLog([]);
            setSwipeStartCount(0);
            setSwipeStopCount(0);
          }}
          text="Reset"
        />
      </view>
      <view class="info">
        <text>
          Current Index: {currentIndex} {isNaN(currentIndex) ? '⚠️ NaN!' : ''}
        </text>
        <text>Data Length: {data.length}</text>
        <text>SwipeStart Count: {swipeStartCount}</text>
        <text>SwipeStop Count: {swipeStopCount}</text>
        <text class="log-title">Callback Log:</text>
        {onChangeLog.map((log, i) => (
          <text key={i} class="log-item">
            {log}
          </text>
        ))}
      </view>
    </view>
  );
}

/**
 * Scenario 3: Data becomes empty during use
 */
function DataBecomesEmpty(): JSX.Element {
  const [data, setData] = useState<number[]>(DEFAULT_DATA);
  const [_currentIndex, setCurrentIndex] = useState<number>(0);
  const swiperRef = useRef<SwiperRef>(null);

  return (
    <view class="section">
      <text class="title">
        Scenario 3: Data Becomes Empty During Use (Does NOT reproduce)
      </text>
      <text class="description">
        Starts with data, then data becomes empty, then data returns.
      </text>
      <Swiper
        ref={swiperRef}
        data={data}
        containerWidth={getContainerWidth()}
        itemWidth={300}
        itemHeight={200}
        duration={500}
        onChange={setCurrentIndex}
        mode="normal"
        loop={true}
        autoPlay={true}
        autoPlayInterval={3000}
        modeConfig={{ align: 'center' }}
      >
        {({ index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <Card index={realIndex} style={{ height: '200px' }} />
          </SwiperItem>
        )}
      </Swiper>
      <view class="buttons">
        <Button
          onClick={() => {
            console.log('Clearing data...');
            setData([]);
            // After a short delay, restore data - this can trigger the bug
            setTimeout(() => {
              console.log('Restoring data...');
              setData(DEFAULT_DATA);
            }, 500);
          }}
          text="Clear then Restore"
          type="primary"
        />
      </view>
      <view class="info">
        <text>Data Length: {data.length}</text>
      </view>
    </view>
  );
}

/**
 * Scenario 4: Reset with corrupted prevIndexRef
 */
function ResetWithCorruptedIndex(): JSX.Element {
  const [data, setData] = useState<number[]>([]);
  const [swiperKey, setSwiperKey] = useState<string>('key-1');
  const swiperRef = useRef<SwiperRef>(null);

  useEffect(() => {
    // First, let swiper initialize with empty data
    // Then load data
    setTimeout(() => {
      setData(DEFAULT_DATA);
    }, 500);
  }, []);

  return (
    <view class="section">
      <text class="title">
        Scenario 4: Reset After Empty Init (Does NOT reproduce)
      </text>
      <text class="description">
        Swiper resets (via swiperKey change) after being initialized empty. The
        prevIndexRef may contain NaN from the empty state.
      </text>
      <Swiper
        ref={swiperRef}
        swiperKey={swiperKey}
        data={data}
        containerWidth={getContainerWidth()}
        itemWidth={300}
        itemHeight={200}
        duration={500}
        mode="normal"
        loop={true}
        autoPlay={false}
        modeConfig={{ align: 'center' }}
      >
        {({ index, realIndex }) => (
          <SwiperItem index={index} key={realIndex} realIndex={realIndex}>
            <Card index={realIndex} style={{ height: '200px' }} />
          </SwiperItem>
        )}
      </Swiper>
      <view class="buttons">
        <Button
          onClick={() => {
            // Change swiperKey to trigger reset
            // This may use the corrupted prevIndexRef
            setSwiperKey(`key-${Date.now()}`);
          }}
          text="Reset Swiper"
          type="primary"
        />
      </view>
    </view>
  );
}

function EmptyDataBugExample(): JSX.Element {
  return (
    <scroll-view class="container" scroll-orientation="vertical">
      <text class="main-title">Empty Data Bug Reproduction</text>
      <text class="main-description">
        These examples demonstrate the "calcBounceOffset: invalid offset" error
        that occurs when Swiper is initialized with empty data.
      </text>
      <EmptyDataWithAutoPlay />
      <EmptyDataWithManualSwipe />
      <DataBecomesEmpty />
      <ResetWithCorruptedIndex />
    </scroll-view>
  );
}

root.render(<EmptyDataBugExample />);

export default EmptyDataBugExample;
