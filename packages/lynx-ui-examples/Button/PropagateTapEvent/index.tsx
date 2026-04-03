// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useMemo, useState } from '@lynx-js/react';

import { Button } from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

import { LogPanel } from './LogPanel';
import { createLogger } from './utils/log';
import type { LogItem } from './utils/log';

import './index.css';

function App() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const logger = useMemo(() => createLogger({ setLogs, max: 8 }), []);

  return (
    <view
      className="container lunaris-dark"
      bindtap={() => {
        console.info('container clicked');
        logger.pushLog('container clicked');
      }}
    >
      <Button
        onClick={() => {
          console.info('button clicked');
          logger.pushLog('button clicked');
        }}
        className="button-root"
      >
        {({ active = false }) => (
          <view className={clsx('button', { active: active })}>
            <text className="text">Click Me!</text>
          </view>
        )}
      </Button>

      <LogPanel
        logs={logs}
        onClear={() => {
          logger.clearLogs();
          logger.pushLog('log cleared');
        }}
      />
    </view>
  );
}
root.render(<App />);
export default App;
