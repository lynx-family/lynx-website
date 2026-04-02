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

import { ActionButton, SnapButton, TriggerButton } from '../shared/index.js';

import './index.css';

const snapPoints = ['40%', '60%', '90%'];

function App() {
  const sheetRef = useRef<SheetRootRef>(null);

  return (
    <view className="container lunaris-dark">
      <text className="title-text">Imperative Sheet</text>

      <TriggerButton
        text="Open Sheet (via ref)"
        onClick={() => sheetRef.current?.open()}
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
        onSnapChange={(snapIndex, snapValue) => {
          console.log(snapIndex, snapValue);
        }}
      >
        <SheetView className="sheet-viewport">
          <SheetBackdrop className="sheet-overlay" clickToClose={true} />
          <SheetContent
            className="sheet-content"
            innerClassName="sheet-inner-content"
            snapAnimation={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <SheetHandle className="sheet-handle" />
            <view className="control-panel">
              <text className="header-text">Imperative Methods</text>

              <view className="button-group">
                <SnapButton
                  text="40%"
                  onClick={() => sheetRef.current?.snapTo(0)}
                />
                <SnapButton
                  text="60%"
                  onClick={() => sheetRef.current?.snapTo(1)}
                />
                <SnapButton
                  text="90%"
                  onClick={() => sheetRef.current?.snapTo(2)}
                />
                <SnapButton
                  text="Expand (Max)"
                  onClick={() => sheetRef.current?.expand()}
                />
                <SnapButton
                  text="Collapse (Min)"
                  onClick={() => sheetRef.current?.collapse()}
                />
              </view>

              <ActionButton
                text="Close"
                onClick={() => sheetRef.current?.close()}
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
