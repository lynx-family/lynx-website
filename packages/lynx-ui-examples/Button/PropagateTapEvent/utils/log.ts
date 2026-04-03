// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

export interface LogItem {
  id: number;
  ts: number;
  msg: string;
}

export function createLogger(params: {
  setLogs: (updater: (prev: LogItem[]) => LogItem[]) => void;
  max?: number;
}) {
  const { setLogs, max = 30 } = params;
  let seq = 0;

  const pushLog = (msg: string) => {
    const it: LogItem = { id: ++seq, ts: Date.now(), msg };
    setLogs((prev) => [...prev, it].slice(-max));
  };
  const clearLogs = () => setLogs(() => []);

  return { pushLog, clearLogs };
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}
