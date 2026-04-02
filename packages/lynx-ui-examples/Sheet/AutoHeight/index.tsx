// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { root, useRef } from '@lynx-js/react';

import {
  SheetBackdrop,
  SheetContent,
  SheetHandle,
  SheetRoot,
  SheetView,
} from '@lynx-js/lynx-ui';
import type { SheetRootRef } from '@lynx-js/lynx-ui';

import { ActionButton, TriggerButton } from '../shared/index.js';
import './index.css';

const snapPoints = ['fit'];
const claimedGestureAngles: [number, number][] = [
  [-135, -45],
  [45, 135],
];

const longText =
  'The Sheet component supports autoHeight mode, where the height is dynamically calculated based on its content. '.repeat(
    10,
  );

function App() {
  const sheetRef = useRef<SheetRootRef>(null);

  return (
    <view className="container lunaris-dark">
      <text className="title-text">Sheet Auto Height</text>

      <TriggerButton
        onClick={() => sheetRef.current?.open()}
        text="Open Sheet (via ref)"
      />

      <SheetRoot
        ref={sheetRef}
        onShowChange={(show) => {
          console.log('show change', show);
        }}
        onOpen={() => {
          console.log('open change');
        }}
        onClose={() => {
          console.log('close change');
        }}
        snapPoints={snapPoints}
        initialSnap={0}
        claimedGestureAngles={claimedGestureAngles}
        onSnapChange={(snapIndex, snapValue) => {
          console.log(snapIndex, snapValue);
        }}
      >
        <SheetView className="sheet-viewport">
          <SheetBackdrop className="sheet-overlay" />
          <SheetContent
            className="sheet-content"
            innerClassName="sheet-inner-content"
          >
            <SheetHandle className="sheet-handle" />
            <view className="control-panel">
              <text className="header-text">Sheet with Long Content</text>
              <text className="info-text">{longText}</text>
              <ActionButton
                onClick={() => sheetRef.current?.close()}
                text="Close via Ref"
              />
            </view>
          </SheetContent>
        </SheetView>
      </SheetRoot>
    </view>
  );
}

root.render(<App />);

export default App;
