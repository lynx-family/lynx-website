// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import type BCD from '../lynx-compat-data';
import React, { useContext } from 'react';

export const BrowserInfoContext = React.createContext<BCD.Platforms | null>(
  null,
);

export function BrowserName({ id }: { id: BCD.PlatformName }) {
  const browserInfo = useContext(BrowserInfoContext);
  if (!browserInfo) {
    throw new Error('Missing browser info');
  }
  return <>{browserInfo[id].name}</>;
}
