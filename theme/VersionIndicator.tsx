import { useLocation } from '@rspress/core/runtime';
import { SUBSITES_CONFIG } from '@site/shared-route-config';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

import { getLangPrefix } from '../shared-route-config';

import { withBase, useI18n, useLang } from '@rspress/core/runtime';
import versionJson from '../docs/public/version.json';

export function VersionIndicator() {
  var { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
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

  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => setIsOpen(false), 200);
    setHoverTimeout(timeout);
  };

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
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center rounded-md px-1.5 py-2 text-sm text-foreground hover:bg-accent -ml-1 -mb-1"
            >
              {displayVersion}{' '}
              <ChevronDown className="h-4 w-4 ml-1" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-28 p-0" align="start">
            <div className="p-2">
              {versions
                .filter((version) => version !== '3.2' && version !== '3.3')
                .map((version) => (
                  <DropdownMenuItem
                    key={version}
                    className={`w-full justify-start ${version === displayVersion ? 'bg-primary/10 text-primary' : ''}`}
                    onClick={() => changeVersion(version)}
                  >
                    {version}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                key="versions"
                className={`w-full justify-start ${'versions' === displayVersion ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => viewAllVersions()}
              >
                {t('all_versions')}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>
    )
  );
}
