// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import './index.css';

import { SortableItem, SortableRoot } from '@lynx-js/lynx-ui';
import type { SortableData } from '@lynx-js/lynx-ui';

import type { SortableDemoItem } from '../shared/data';
import { createDemoData } from '../shared/data';

export function App() {
  const [data, setData] =
    useState<SortableData<SortableDemoItem>[]>(createDemoData);

  return (
    <view className="sortable-root lunaris-dark">
      <SortableRoot
        data={data}
        onSortEnd={(sortedData: SortableData<SortableDemoItem>[]) => {
          setData(sortedData);
        }}
      >
        {(item: SortableData<SortableDemoItem>) => {
          const { id, tone } = item.dataItem;
          return (
            <SortableItem
              key={item.getSortingKey()}
              className={`sortable-item sortable-item--${id}`}
              sortingKey={item.getSortingKey()}
            >
              <text className={`drag-here-text drag-here-text--${tone}`}>
                {id}
              </text>
            </SortableItem>
          );
        }}
      </SortableRoot>
    </view>
  );
}

root.render(<App />);
