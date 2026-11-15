import { useLang, useLocation } from '@rspress/core/runtime';
import type { SidebarData } from '@rspress/core';
import { SidebarList } from '@rspress/core/theme-original';
import { SHARED_SIDEBAR_PATHS, getLangPrefix } from '@route-config';
import './index.scss';
import './SubsiteRow.scss';

import { SubsiteRow } from './SubsiteRow';

// Render the divider through SidebarList so its geometry (border, margin)
// is byte-identical to every other rp-sidebar-divider rspress emits in
// the sidebar — instead of a hand-rolled <div> whose spacing we'd have to
// keep in sync as rspress evolves.
const HEADER_DIVIDER: SidebarData = [{ dividerType: 'solid' }];

export default function BeforeSidebar() {
  const lang = useLang();
  const { pathname } = useLocation();

  const isSharedPath = SHARED_SIDEBAR_PATHS.some((prefix) =>
    pathname.startsWith(`${getLangPrefix(lang)}/${prefix}`),
  );
  if (!isSharedPath) return null;

  return (
    <div id="before-sidebar">
      <SubsiteRow />
      <SidebarList sidebarData={HEADER_DIVIDER} setSidebarData={() => {}} />
    </div>
  );
}
