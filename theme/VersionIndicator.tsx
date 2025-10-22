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

import { withBase, useI18n } from '@rspress/core/runtime';
import versionJson from '../docs/public/version.json';

export function VersionIndicator() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const homepagePaths = SUBSITES_CONFIG.flatMap((site) => [
    site.home,
    site.home.endsWith('/') ? site.home.slice(0, -1) : `${site.home}/`,
  ]);
  const isHomepage = homepagePaths.includes(pathname);

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
    window.location.href = '/next/versions';
  };

  const displayVersion = versionJson.current_version;
  const t = useI18n();
  return (
    !isHomepage && (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="sh-flex sh-items-center sh-rounded-md sh-px-1.5 sh-py-2 sh-text-sm sh-text-foreground hover:sh-bg-accent -sh-ml-1 -sh-mb-1"
            >
              {displayVersion}{' '}
              <ChevronDown
                className="sh-h-4 sh-w-4 sh-ml-1"
                strokeWidth={1.5}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="sh-w-28 sh-p-0" align="start">
            <div className="sh-p-2">
              {versions
                .filter((version) => version !== '3.2' && version !== '3.3')
                .map((version) => (
                  <DropdownMenuItem
                    key={version}
                    className={`sh-w-full sh-justify-start ${version === displayVersion ? 'sh-bg-primary/10 sh-text-primary' : ''}`}
                    onClick={() => changeVersion(version)}
                  >
                    {version}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                key="versions"
                className={`sh-w-full sh-justify-start ${'versions' === displayVersion ? 'sh-bg-primary/10 sh-text-primary' : ''}`}
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
