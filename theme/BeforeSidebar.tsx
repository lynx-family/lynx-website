import { useEffect, useState } from 'react';
import { useLang, useLocation } from '@rspress/core/runtime';
import { type SidebarData, SidebarList } from '@rspress/core/theme-original';
import {
  SHARED_SIDEBAR_PATHS,
  createSharedRouteSidebar,
  getLangPrefix,
} from '@site/shared-route-config';
import './index.scss';

import { SubsiteRow } from './SubsiteRow';

export default function BeforeSidebar() {
  const lang = useLang();
  const { pathname } = useLocation();

  // Initialize sidebar data based on current path and language
  const [sidebarData, setSidebarData] = useState<SidebarData>(() =>
    createSharedRouteSidebar(lang, pathname),
  );

  useEffect(() => {
    // Check if current path should show shared sidebar
    const isSharedPath = SHARED_SIDEBAR_PATHS.some((prefix) =>
      pathname.startsWith(`${getLangPrefix(lang)}/${prefix}`),
    );

    // Update sidebar data based on path:
    // - For shared paths: generate new sidebar data
    // - For non-shared paths: set to empty to hide sidebar
    //
    // Since the container component (Sidebar) re-renders in useEffect (next tick),
    // we need to reset here to ensure both components update in the same tick.
    // This avoids UI jump when switching in/out of shared paths.
    const newSidebarData = isSharedPath
      ? createSharedRouteSidebar(lang, pathname)
      : [];
    setSidebarData(newSidebarData);
  }, [lang, pathname]);

  // Only render if we have sidebar data and it's not empty
  if (!sidebarData || sidebarData.length === 0) {
    return null;
  }

  return (
    <div id="before-sidebar">
      <SidebarList sidebarData={sidebarData} setSidebarData={setSidebarData} />
      <SubsiteRow />
    </div>
  );
}
