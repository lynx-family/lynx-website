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

const snapPoints = ['50%'];

function App() {
  const sheetRef = useRef<SheetRootRef>(null);

  return (
    <view className="container lunaris-dark">
      <text className="title-text">Basic Sheet</text>
      <TriggerButton
        onClick={() => sheetRef.current?.open()}
        text="Open Sheet"
      />
      <SheetRoot
        ref={sheetRef}
        snapPoints={snapPoints}
        initialSnap={0}
        onOpen={() => console.log('Sheet opened')}
        onClose={() => console.log('Sheet closed')}
      >
        <SheetView className="sheet-viewport">
          <SheetBackdrop className="sheet-overlay" clickToClose={true} />
          <SheetContent
            className="sheet-content"
            innerClassName="sheet-inner-content"
          >
            <SheetHandle className="sheet-handle" />
            <view className="control-panel">
              <text className="header-text">Basic Sheet</text>
              <text className="info-text">
                Simple uncontrolled sheet. Drag or tap backdrop to dismiss.
              </text>
              <ActionButton
                onClick={() => sheetRef.current?.close()}
                text="Close"
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
