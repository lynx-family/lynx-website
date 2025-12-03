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
