import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useLang, useLocation, useNavigate } from '@rspress/core/runtime';
import { type SidebarData, SidebarList } from '@rspress/core/theme';
import {
  SHARED_SIDEBAR_PATHS,
  SUBSITES_CONFIG,
  createSharedRouteSidebar,
  getLangPrefix,
} from '@site/shared-route-config';
import './index.scss';

import type { SubsiteConfig } from '@site/shared-route-config';

import { SubsiteView } from './subsite-ui';

function findSubsiteFromPathname(
  pathname: string,
  lang: string,
): SubsiteConfig {
  const langPrefix = getLangPrefix(lang);
  let path = pathname;

  if (langPrefix && path.startsWith(`${langPrefix}/`)) {
    path = path.slice(langPrefix.length + 1);
  } else if (!langPrefix && path.startsWith('/')) {
    path = path.slice(1);
  }

  if (!path) {
    return SUBSITES_CONFIG[0];
  }

  const [firstSegment] = path.split('/');
  const normalizedSegment = firstSegment.replace(/\.html$/, '');

  const subsite =
    SUBSITES_CONFIG.find((s) => s.value === normalizedSegment) ||
    SUBSITES_CONFIG[0];

  return subsite;
}

function SubsiteSelect() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const lang = useLang();
  const [selectedSubsite, setSelectedSubsite] = useState<SubsiteConfig>(() =>
    findSubsiteFromPathname(pathname, lang),
  );

  useEffect(() => {
    const subsite = findSubsiteFromPathname(pathname, lang);
    if (subsite.value !== selectedSubsite.value) {
      setSelectedSubsite(subsite);
    }
  }, [lang, pathname, selectedSubsite.value]);

  const handleValueChange = (value: string) => {
    const newSubsite = SUBSITES_CONFIG.find((s) => s.value === value);
    if (newSubsite) {
      setSelectedSubsite(newSubsite);
      navigate(`${getLangPrefix(lang)}${newSubsite.url}`);
    }
  };

  return (
    <div className="sh-w-full sh-pl-2 sh-pr-1 sh-my-2">
      <Select onValueChange={handleValueChange} value={selectedSubsite.value}>
        <SelectTrigger className="sh-h-auto sh-border-0 sh-bg-transparent sh-px-4 sh-py-2 sh-shadow-none [&>span]:sh-flex [&>span]:sh-flex-1 sh-relative before:sh-pointer-events-none before:sh-absolute before:sh-inset-0 before:sh-size-full before:sh-rounded-md before:sh-p-[1px] before:sh-will-change-[background-position] before:sh-content-[''] before:sh-[-webkit-mask-composite:xor] before:sh-[mask-composite:exclude] before:sh-bg-shine before:sh-bg-[length:300%_300%] before:[mask:linear-gradient(white_0_0)_content-box,linear-gradient(white_0_0)] before:sh-opacity-0 hover:before:sh-opacity-100 before:sh-transition-opacity before:sh-duration-300 hover:motion-safe:before:sh-animate-shine sh-transition-all hover:sh-shadow-[0_0_12px_-3px_var(--rp-c-brand)] hover:sh-translate-y-[-1px]">
          <div className="sh-flex sh-w-full sh-items-center sh-gap-2 sh-relative">
            <SubsiteView subsite={selectedSubsite} lang={lang} size="minimal" />
          </div>
        </SelectTrigger>
        <SelectContent className="sh-min-w-[240px]">
          {SUBSITES_CONFIG.map((subsite) => (
            <SelectItem
              key={subsite.value}
              value={subsite.value}
              className="!sh-pl-3 sh-py-2 [&>span:first-child]:sh-hidden"
            >
              <SubsiteView subsite={subsite} lang={lang} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
      <SubsiteSelect />
    </div>
  );
}
