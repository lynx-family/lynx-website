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

import { ActionButton, TriggerButton } from '../shared/index.js';

import './index.css';

const snapPoints = ['50%', '80%'];

const defaultShow = true;

function App() {
  const sheetRef = useRef<SheetRootRef>(null);

  // Uncontrolled example: we still mirror open state to sync other UI
  const [show, setShow] = useState(defaultShow);

  return (
    <view className="container lunaris-dark">
      <text className="title-text">Sheet Default Open</text>

      <TriggerButton
        disabled={show}
        onClick={() => sheetRef.current?.open()}
        text={show ? 'Opened' : 'Open (via ref)'}
      />

      <SheetRoot
        ref={sheetRef}
        defaultShow={defaultShow}
        onShowChange={(newShow) => {
          console.log('onShowChange:', newShow);
          setShow(newShow);
        }}
        onOpen={() => console.log('onOpen')}
        onClose={() => console.log('onClose')}
        snapPoints={snapPoints}
        initialSnap={0}
      >
        <SheetView className="sheet-viewport">
          <SheetBackdrop className="sheet-overlay" clickToClose={true} />
          <SheetContent
            className="sheet-content"
            innerClassName="sheet-inner-content"
          >
            <SheetHandle className="sheet-handle" />
            <view className="control-panel">
              <text className="header-text">Default Open</text>
              <text className="info-text">
                This sheet starts with defaultShow=true in uncontrolled mode.
              </text>
              <ActionButton
                onClick={() => sheetRef.current?.close()}
                text="Close (via ref)"
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
