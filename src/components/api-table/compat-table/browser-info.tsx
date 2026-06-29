/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *   Original source from MDN Yari:
 *   https://github.com/mdn/yari/tree/main/client/src/document/ingredients/browser-compatibility-table
 *   Copyright Mozilla Contributors
 *   Licensed under the Mozilla Public License, v. 2.0
 */
import type BCD from '@lynx-js/lynx-compat-data';
import React, { useContext } from 'react';

export const BrowserInfoContext = React.createContext<BCD.Platforms | null>(
  null,
);

export function BrowserName({
  id,
  platformType,
}: {
  id: BCD.PlatformName;
  platformType?: string;
}) {
  const browserInfo = useContext(BrowserInfoContext);
  if (!browserInfo) {
    throw new Error('Missing browser info');
  }

  if (platformType === 'native') {
    if (id === 'clay_macos') {
      return <>macOS</>;
    }
    if (id === 'clay_windows') {
      return <>Windows</>;
    }
  }

  return <>{browserInfo[id].name}</>;
}
