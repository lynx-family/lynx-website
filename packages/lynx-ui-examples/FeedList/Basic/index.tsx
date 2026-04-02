// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useMemo, useRef, useState } from '@lynx-js/react';

import { FeedList } from '@lynx-js/lynx-ui';
import type { FeedListRef } from '@lynx-js/lynx-ui';

import { RectangleCard } from './RectangleCard';

import './index.css';

function App() {
  const feedListRef = useRef<FeedListRef>(null);
  const letters1 = [
    { itemKey: 'F', letter: 'F' },
    { itemKey: 'E', letter: 'E' },
    { itemKey: 'E-2', letter: 'E' },
    { itemKey: 'D', letter: 'D' },
    { itemKey: 'L', letter: 'L' },
    { itemKey: 'I', letter: 'I' },
    { itemKey: 'S', letter: 'S' },
    { itemKey: 'T', letter: 'T' },
  ];
  const letters2 = [
    { itemKey: 'L-2', letter: 'L' },
    { itemKey: 'Y', letter: 'Y' },
    { itemKey: 'N', letter: 'N' },
    { itemKey: 'X', letter: 'X' },
    { itemKey: 'U', letter: 'U' },
    { itemKey: 'I-2', letter: 'I' },
  ];
  const letters3 = [
    { itemKey: 'R', letter: 'R' },
    { itemKey: 'E-3', letter: 'E' },
    { itemKey: 'F-2', letter: 'F' },
    { itemKey: 'R-2', letter: 'R' },
    { itemKey: 'E-4', letter: 'E' },
    { itemKey: 'S-2', letter: 'S' },
    { itemKey: 'H', letter: 'H' },
  ];
  const [contentArray, setContentArray] = useState(letters1);

  const orientation = 'vertical';

  const renderRefreshHeader = useMemo(
    () => (
      <view className="refresh-header">
        <image
          src="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/plugin/static/loading.gif"
          style={{
            width: '50px',
            height: '50px',
            relativeCenter: 'horizontal',
          }}
        />
      </view>
    ),
    [],
  );

  const renderLoadMoreFooter = useMemo(
    () => (
      <list-item key="footer" item-key="footer" full-span>
        <view
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          <text style={{ marginBottom: '10px' }}>loading more...</text>
          <image
            src="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/plugin/static/loading.gif"
            style={{
              width: '50px',
              height: '50px',
            }}
          />
        </view>
      </list-item>
    ),
    [],
  );

  const renderNoMoreFooter = useMemo(
    () => (
      <list-item key="noMore" item-key="noMore" full-span>
        <text style={{ width: '100%', height: '30px', textAlign: 'center' }}>
          That's everything!
        </text>
      </list-item>
    ),
    [],
  );

  const handleRefreshEvent = () => {
    setTimeout(() => {
      feedListRef?.current?.finishRefresh();
      setContentArray(letters2);
    }, 2000);
  };

  const noMoreData = useRef(false); // Flag to determine whether the data is over.

  const addDataToLower = () => {
    setTimeout(() => {
      if (noMoreData.current) {
        feedListRef?.current?.changeHasMoreStatus(false);
      } else {
        setContentArray(letters1.concat(letters3));
        noMoreData.current = true;
      }
    }, 2000);
  };

  console.info('render', contentArray);

  return (
    <view className="lunaris-dark container">
      <FeedList
        className="feed-list"
        listId="feedListBasic"
        ref={feedListRef}
        listType="single"
        spanCount={1}
        scrollOrientation={orientation}
        refreshOptions={{
          enableRefresh: true,
          headerContent: renderRefreshHeader,
          onStartRefresh: handleRefreshEvent,
        }}
        loadMoreFooter={renderLoadMoreFooter}
        noMoreDataFooter={renderNoMoreFooter}
        useRefactorList={true}
        bounces={false}
        upperThresholdItemCount={1}
        lowerThresholdItemCount={1}
        onScrollToLower={() => {
          addDataToLower();
        }}
      >
        {contentArray.map((value: { itemKey: string; letter: string }) => (
          <list-item key={value.itemKey} item-key={value.itemKey}>
            <RectangleCard
              cardKey={value.itemKey}
              letter={value.letter}
              height={500}
            />
          </list-item>
        ))}
      </FeedList>
    </view>
  );
}

root.render(<App />);

export default App;
