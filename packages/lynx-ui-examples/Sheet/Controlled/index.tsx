// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { root, useRef, useState } from '@lynx-js/react';

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

const snapPoints = ['40%', '80%'];

function App() {
  const sheetRef = useRef<SheetRootRef>(null);
  // Fully controlled state - parent manages show/hide
  const [show, setShow] = useState(false);

  return (
    <view className="container lunaris-dark">
      <text className="title-text">Controlled Sheet</text>
      <text className="subtitle-text">show: {show ? 'true' : 'false'}</text>
      <TriggerButton
        onClick={() => setShow((s) => !s)}
        text={show ? 'Opened' : 'Open (setShow(true))'}
      />
      <SheetRoot
        ref={sheetRef}
        show={show}
        onShowChange={(newShow) => {
          console.log('onShowChange:', newShow);
          setShow(newShow);
        }}
        onOpen={() => {
          console.log('onOpen - sheet fully opened');
        }}
        onClose={() => {
          console.log('onClose - sheet fully closed');
        }}
        snapPoints={snapPoints}
        initialSnap={0}
        onSnapChange={(snapIndex, snapValue) => {
          console.log('onSnapChange:', snapIndex, snapValue);
        }}
      >
        <SheetView className="sheet-viewport">
          <SheetBackdrop className="sheet-overlay" clickToClose={true} />
          <SheetContent
            className="sheet-content"
            innerClassName="sheet-inner-content"
            snapAnimation={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <SheetHandle className="sheet-handle" />
            <view className="control-panel">
              <text className="header-text">Controlled Sheet</text>
              <text className="info-text">
                The parent component manages the `show` state. Backdrop taps and
                gestures trigger `onShowChange`.
              </text>
              <view className="button-group">
                <SnapButton
                  onClick={() => sheetRef.current?.snapTo(0)}
                  text="Snap to 40%"
                />
                <SnapButton
                  onClick={() => sheetRef.current?.snapTo(1)}
                  text="Snap to 80%"
                />
              </view>

              <ActionButton
                onClick={() => setShow(false)}
                text="Close (setShow(false))"
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
