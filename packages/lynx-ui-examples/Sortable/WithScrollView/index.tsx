// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useCallback, useState } from '@lynx-js/react';

import './index.css';

import { SortableItem, SortableItemArea, SortableRoot } from '@lynx-js/lynx-ui';
import type { SortableData } from '@lynx-js/lynx-ui';

import type { SortableDemoItem } from '../shared/data';
import { createDemoData } from '../shared/data';

export function App() {
  const [data, setData] =
    useState<SortableData<SortableDemoItem>[]>(createDemoData);
  const [enableScroll, setEnableScroll] = useState(true);

  const handleSortStart = useCallback(() => {
    setEnableScroll(false);
  }, []);

  const handleSortEnd = useCallback(
    (sortedData: SortableData<SortableDemoItem>[]) => {
      setEnableScroll(true);
      setData(sortedData);
    },
    [],
  );

  const renderSortableItem = useCallback(
    (item: SortableData<SortableDemoItem>) => {
      const { id, tone } = item.dataItem;

      return (
        <SortableItem
          key={item.getSortingKey()}
          as="DraggableRoot"
          className={`sortable-item sortable-item--${id}`}
          sortingKey={item.getSortingKey()}
        >
          <SortableItemArea className="sortable-item-area">
            <text className={`drag-here-text drag-here-text--${tone}`}>
              Drag Here
            </text>
          </SortableItemArea>
        </SortableItem>
      );
    },
    [],
  );

  return (
    <scroll-view
      className="scroll-view lunaris-dark luna-gradient-berry"
      enable-scroll={enableScroll}
      scroll-orientation="vertical"
    >
      <view
        className="sortable-root"
        id="sortableRoot"
        // Required: establish a stacking context for sortable drag layers
        style={{ zIndex: '0' }}
      >
        <SortableRoot
          data={data}
          onSortStart={handleSortStart}
          onSortEnd={handleSortEnd}
          boundaryId="sortableRoot"
        >
          {renderSortableItem}
        </SortableRoot>
      </view>
    </scroll-view>
  );
}

root.render(<App />);
