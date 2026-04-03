// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import type { SortableData } from '@lynx-js/lynx-ui';

export type Tone = 'neutral' | 'primary' | 'secondary';

export interface SortableDemoItem {
  id: string;
  tone: Tone;
}

export function getToneByIndex(i: number): Tone {
  if (i > 0 && i < 4) return 'primary';
  if (i > 3) return 'secondary';
  return 'neutral';
}

export function createDemoData(count = 6): SortableData<SortableDemoItem>[] {
  return Array.from({ length: count }, (_, i) => {
    const id = String(i);
    return {
      dataItem: { id, tone: getToneByIndex(i) },
      getSortingKey: () => id,
    };
  });
}
