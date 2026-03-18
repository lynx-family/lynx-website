import { useLocation } from '@rspress/core/runtime';
import { SUBSITES_CONFIG } from '@site/shared-route-config';
import { useState, useEffect } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

import { getLangPrefix } from '../shared-route-config';

import { withBase, useI18n, useLang } from '@rspress/core/runtime';
import versionJson from '../docs/public/version.json';

const menuItemClassName =
  'relative flex w-full cursor-default select-none items-center justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground';

export function VersionIndicator() {
  var { pathname } = useLocation();
  const langPrefix = getLangPrefix(useLang());

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
    var homepagePaths = SUBSITES_CONFIG.flatMap((site) => [
      site.home,
      site.home.endsWith('/') ? site.home.slice(0, -1) : `${site.home}/`,
    ]);
    homepagePaths.push('/versions');
    const specificPath =
      homepagePaths.includes(pathname) || pathname.startsWith('/blog');
    return !specificPath;
  };

  const [versions, setVersions] = useState<string[]>(['next']);

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
    const currentPath = window.location.pathname;
    const searchParams = window.location.search;

    const currentBasePath = withBase('');
    const pathWithoutBase = currentPath.startsWith(currentBasePath)
      ? currentPath.slice(currentBasePath.length)
      : currentPath;

    const newPath = `/${version}/${pathWithoutBase}`;
    window.location.href = newPath + searchParams;
  };

  const viewAllVersions = () => {
    window.open(`/next${langPrefix}/versions`, '_blank');
  };

  const displayVersion = versionJson.current_version;
  const t = useI18n();
  return (
    showIndicator() && (
      <HoverCard openDelay={0} closeDelay={200}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="flex items-center rounded-md px-1.5 py-2 text-sm text-foreground hover:bg-accent -ml-1 -mb-1"
          >
            {displayVersion}{' '}
            <ChevronDown className="h-4 w-4 ml-1" strokeWidth={1.5} />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-28 p-0" align="start">
          <div className="p-2">
            {versions
              .filter((version) => version !== '3.2' && version !== '3.3')
              .map((version) => (
                <button
                  key={version}
                  type="button"
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
              key="versions"
              type="button"
              className={cn(
                menuItemClassName,
                'versions' === displayVersion && 'bg-primary/10 text-primary',
              )}
              onClick={() => viewAllVersions()}
            >
              {t('all_versions')}
            </button>
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  );
}
