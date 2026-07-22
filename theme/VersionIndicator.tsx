import { useLocation, useI18n, useLang } from '@rspress/core/runtime';
import { useState, useEffect } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import useIfMobile from '@site/theme/hooks/use-if-mobile';
import { ChevronDown } from 'lucide-react';

import { getLangPrefix } from '../shared-route-config';
import versionJson from '../docs/public/version.json';

const menuItemClassName =
  'relative flex w-full cursor-default select-none items-center justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground';

function shouldHideVersion(version: string) {
  if (version === '3.2' || version === '3.3') {
    return true;
  }

  if (process.env.OSS === '1.0') {
    return false;
  }

  return false;
}

function stripVersionPrefix(pathname: string) {
  return pathname.replace(/^\/(?:next|\d+\.\d+)(?=\/|$)/, '') || '/';
}

function joinVersionPath(version: string, pathname: string) {
  const normalizedPathname = pathname.startsWith('/')
    ? pathname
    : `/${pathname}`;

  return `/${version}${normalizedPathname}`;
}

export function VersionIndicator() {
  var { pathname } = useLocation();
  const langPrefix = getLangPrefix(useLang());
  const [versions, setVersions] = useState<string[]>(['next']);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIfMobile();

  const showIndicator = () => {
    if (pathname.startsWith('/zh')) {
      pathname = pathname.replace('/zh', '');
    }
    if (pathname.endsWith('/index.html')) {
      pathname = pathname.replace('/index.html', '');
    }
    if (pathname.endsWith('.html')) {
      pathname = pathname.replace('.html', '');
    }
    // Hide on the versions index and blog listing — those pages already
    // surface version/context. Show on docs *and* homepage/subsite homes so
    // visitors can switch versions without first diving into a guide page.
    return pathname !== '/versions' && !pathname.startsWith('/blog');
  };

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch('/next/version.json');
        if (!response.ok) {
          throw new Error('Failed to fetch versions');
        }
        const data = await response.json();
        if (data.versions && Array.isArray(data.versions)) {
          setVersions(data.versions.map((item: any) => item.version_number));
        }
      } catch (error) {
        console.error('Error fetching versions:', error);
      }
    };
    fetchVersions();
  }, []);

  const changeVersion = (version: string) => {
    setIsOpen(false);
    const currentPath = window.location.pathname;
    const pathWithoutVersion = stripVersionPrefix(currentPath);
    const newPath = joinVersionPath(version, pathWithoutVersion);

    window.location.href =
      newPath + window.location.search + window.location.hash;
  };

  const viewAllVersions = () => {
    setIsOpen(false);
    window.open(`/next${langPrefix}/versions`, '_blank');
  };

  const displayVersion = versionJson.current_version;
  const t = useI18n();
  const filteredVersions = versions.filter(
    (version) => !shouldHideVersion(version),
  );

  const versionMenu = (
    <div className="p-2" role="menu" aria-orientation="vertical">
      {filteredVersions.map((version) => (
        <button
          key={version}
          type="button"
          role="menuitem"
          className={cn(
            menuItemClassName,
            version === displayVersion && 'bg-primary/10 text-primary',
          )}
          onClick={() => changeVersion(version)}
        >
          {version}
        </button>
      ))}
      <button
        type="button"
        role="menuitem"
        className={menuItemClassName}
        onClick={() => viewAllVersions()}
      >
        {t('all_versions')}
      </button>
    </div>
  );

  const trigger = (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-haspopup={isMobile ? 'dialog' : 'menu'}
      className="flex items-center rounded-md px-1.5 py-2 text-sm text-foreground hover:bg-accent -ml-1 -mb-1"
    >
      {displayVersion}{' '}
      <ChevronDown className="h-4 w-4 ml-1" strokeWidth={1.5} />
    </button>
  );

  return (
    showIndicator() &&
    (isMobile ? (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <div className="py-5 px-4 pb-7">{versionMenu}</div>
        </DrawerContent>
      </Drawer>
    ) : (
      <HoverCard
        openDelay={0}
        closeDelay={200}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
        <HoverCardContent className="w-28 p-0" align="start">
          {versionMenu}
        </HoverCardContent>
      </HoverCard>
    ))
  );
}
