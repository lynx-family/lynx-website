// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import './index.css';

import { SortableItem, SortableItemArea, SortableRoot } from '@lynx-js/lynx-ui';
import type { SortableData } from '@lynx-js/lynx-ui';

import type { SortableDemoItem } from '../shared/data';
import { createDemoData } from '../shared/data';

export function App() {
  const [data, setData] =
    useState<SortableData<SortableDemoItem>[]>(createDemoData);

  return (
    <view
      className="sortable-root lunaris-dark"
      id="sortableContainer"
      // Required: establish a stacking context for sortable drag layers
      style={{ zIndex: '0' }}
    >
      <SortableRoot
        data={data}
        boundaryId="sortableContainer"
        onSortEnd={(sortedData: SortableData<SortableDemoItem>[]) =>
          setData(sortedData)
        }
      >
        {(item: SortableData<SortableDemoItem>) => {
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
        }}
      </SortableRoot>
    </view>
  );
}

root.render(<App />);
