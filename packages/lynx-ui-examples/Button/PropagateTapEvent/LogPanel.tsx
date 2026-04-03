// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Button } from '@lynx-js/lynx-ui';

import type { LogItem } from './utils/log';
import { formatTime } from './utils/log';

export interface LogPanelProps {
  logs: LogItem[];
  onClear: () => void;
}

export function LogPanel(props: LogPanelProps) {
  const { logs, onClear } = props;

  return (
    <view className="log-panel">
      <view className="log-header">
        <text className="log-title">Event log</text>
        <Button onClick={onClear}>
          {() => (
            <view className="log-clear-btn">
              <text className="log-clear-text">Clear</text>
            </view>
          )}
        </Button>
      </view>

      <view className="log-list">
        {logs.length === 0 ? (
          <text className="log-empty">No events yet.</text>
        ) : (
          logs.map((it) => (
            <view key={it.id} className="log-row">
              <text className="log-meta">
                #{it.id} {formatTime(it.ts)}
              </text>
              <text className="log-msg">{it.msg}</text>
            </view>
          ))
        )}
      </view>
    </view>
  );
}
