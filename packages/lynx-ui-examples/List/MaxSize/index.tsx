// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root } from '@lynx-js/react';

import { List } from '@lynx-js/lynx-ui';

import { ListItemCard } from '../shared/ListItemCard';
import './index.css';

const data = ['L', 'Y', 'N', 'X', 'U', 'I'];

function App() {
  return (
    <view className="container lunaris-dark">
      <List
        className="list-container"
        listId="listBasic"
        listType="single"
        spanCount={1}
        listMaxSize={500}
        scrollOrientation="vertical"
      >
        {data.map((char, index) => (
          <list-item item-key={char} id={char} key={char}>
            <ListItemCard letter={char} height={index % 2 === 0 ? 360 : 240} />
          </list-item>
        ))}
        <list-item item-key="footer" id="footer">
          <ListItemCard letter="footer" height={200} />
        </list-item>
      </List>
    </view>
  );
}

root.render(<App />);

export default App;
