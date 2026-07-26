import { useLocation, withBase, useI18n, useLang } from '@rspress/core/runtime';
import { useState, useEffect, useRef } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import useIfMobile from '@site/theme/hooks/use-if-mobile';
import { ChevronDown, Loader2 } from 'lucide-react';

import { getLangPrefix } from '../shared-route-config';
import versionJson from '../docs/public/version.json';

const menuItemClassName =
  'relative flex w-full cursor-default select-none items-center justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground';

const PREFETCHED = new Set<string>();

function shouldHideVersion(version: string) {
  if (version === '3.2' || version === '3.3') {
    return true;
  }

  if (process.env.OSS === '1.0') {
    return false;
  }

  return false;
}

function buildVersionPath(version: string) {
  const currentPath = window.location.pathname;
  const searchParams = window.location.search;

  const currentBasePath = withBase('');
  const pathWithoutBase = currentPath.startsWith(currentBasePath)
    ? currentPath.slice(currentBasePath.length)
    : currentPath;

  const normalizedRest = pathWithoutBase.startsWith('/')
    ? pathWithoutBase
    : `/${pathWithoutBase}`;

  return `/${version}${normalizedRest === '/' ? '/' : normalizedRest}${searchParams}`;
}

function prefetchVersionPath(path: string) {
  if (typeof document === 'undefined' || PREFETCHED.has(path)) {
    return;
  }
  PREFETCHED.add(path);

  // Warm the edge proxy cache (and browser HTTP cache) before click.
  // A real GET hits functions/_middleware.ts so caches.default can be filled.
  void fetch(path, {
    method: 'GET',
    credentials: 'same-origin',
    ...({ priority: 'low' } as object),
  }).catch(() => {
    // Prefetch is best-effort; navigation still works without it.
  });
}

function VersionSwitchProgress({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="version-switch-progress"
      role="progressbar"
      aria-busy="true"
      aria-label="Loading documentation version"
    >
      <div className="version-switch-progress__bar" />
    </div>
  );
}

export function VersionIndicator() {
  var { pathname } = useLocation();
  const langPrefix = getLangPrefix(useLang());
  const [versions, setVersions] = useState<string[]>(['next']);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const isMobile = useIfMobile();
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  const changeVersion = (version: string) => {
    if (version === versionJson.current_version || pendingVersion) {
      setIsOpen(false);
      return;
    }

    const newPath = buildVersionPath(version);
    setPendingVersion(version);
    setIsOpen(false);
    document.documentElement.dataset.versionSwitching = 'true';

    // Let the pending UI paint before the hard navigation blocks the main thread.
    pendingTimerRef.current = setTimeout(() => {
      window.location.assign(newPath);
    }, 50);
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
  const isSwitching = pendingVersion !== null;

  const versionMenu = (
    <div className="p-2" role="menu" aria-orientation="vertical">
      {filteredVersions.map((version) => {
        const isCurrent = version === displayVersion;
        const isPending = pendingVersion === version;
        return (
          <button
            key={version}
            type="button"
            role="menuitem"
            disabled={isSwitching}
            className={cn(
              menuItemClassName,
              isCurrent && 'bg-primary/10 text-primary',
              isPending && 'bg-primary/10 text-primary',
              isSwitching && !isPending && 'opacity-50',
            )}
            onMouseEnter={() => {
              if (!isCurrent && !isSwitching) {
                prefetchVersionPath(buildVersionPath(version));
              }
            }}
            onFocus={() => {
              if (!isCurrent && !isSwitching) {
                prefetchVersionPath(buildVersionPath(version));
              }
            }}
            onClick={() => changeVersion(version)}
          >
            <span className="flex-1">{version}</span>
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
            )}
          </button>
        );
      })}
      <button
        type="button"
        role="menuitem"
        disabled={isSwitching}
        className={cn(menuItemClassName, isSwitching && 'opacity-50')}
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
      aria-busy={isSwitching}
      disabled={isSwitching}
      className="flex items-center rounded-md px-1.5 py-2 text-sm text-foreground hover:bg-accent -ml-1 -mb-1 disabled:opacity-70"
    >
      {isSwitching ? pendingVersion : displayVersion}{' '}
      {isSwitching ? (
        <Loader2 className="h-4 w-4 ml-1 animate-spin" strokeWidth={1.5} />
      ) : (
        <ChevronDown className="h-4 w-4 ml-1" strokeWidth={1.5} />
      )}
    </button>
  );

  return (
    showIndicator() && (
      <>
        <VersionSwitchProgress active={isSwitching} />
        {isMobile ? (
          <Drawer
            open={isOpen}
            onOpenChange={(open) => {
              if (!isSwitching) {
                setIsOpen(open);
              }
            }}
          >
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
            onOpenChange={(open) => {
              if (!isSwitching) {
                setIsOpen(open);
              }
            }}
          >
            <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
            <HoverCardContent className="w-32 p-0" align="start">
              {versionMenu}
            </HoverCardContent>
          </HoverCard>
        )}
      </>
    )
  );
}
