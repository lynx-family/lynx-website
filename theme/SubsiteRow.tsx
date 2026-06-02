import { useLang, useLocation, useNavigate } from '@rspress/core/runtime';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CORE_SUBSITES, getLangPrefix } from '@site/shared-route-config';
import type { SubsiteConfig } from '@site/shared-route-config';
import { cn } from '@/lib/utils';

import { SubsiteLogo } from './subsite-ui';

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
  if (!path) return CORE_SUBSITES[0];
  const [firstSegment] = path.split('/');
  const normalizedSegment = firstSegment.replace(/\.html$/, '');
  return (
    CORE_SUBSITES.find((s) => s.value === normalizedSegment) ?? CORE_SUBSITES[0]
  );
}

export function SubsiteRow() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const lang = useLang();
  const current = findSubsiteFromPathname(pathname, lang);

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div
        role="navigation"
        aria-label="Subsite switcher"
        className="flex items-center gap-1 px-2 py-2"
      >
        {CORE_SUBSITES.map((subsite) => {
          const isActive = subsite.value === current.value;
          const description =
            lang === 'zh' ? subsite.descriptionZh : subsite.description;
          return (
            <Tooltip key={subsite.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`${getLangPrefix(lang)}${subsite.url}`)
                  }
                  aria-label={subsite.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex h-9 w-9 items-center justify-center rounded-md',
                    'transition-colors duration-150 ease-out',
                    'hover:bg-accent/60',
                    isActive
                      ? 'text-foreground'
                      : 'text-foreground/70 hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'block h-5 w-5 transition-opacity duration-150',
                      isActive
                        ? 'opacity-100'
                        : 'opacity-70 group-hover:opacity-100',
                    )}
                  >
                    <SubsiteLogo subsite={subsite} />
                  </span>
                  {isActive && (
                    <span
                      className="pointer-events-none absolute -bottom-1 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full"
                      style={{
                        background:
                          'var(--rp-c-brand, var(--major-brand-color, #ff351a))',
                      }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="center"
                sideOffset={10}
                className="p-0 border bg-popover shadow-md"
              >
                <div className="flex items-center gap-3 px-3 py-2 min-w-[160px]">
                  <div className="relative h-6 w-6 shrink-0">
                    <SubsiteLogo subsite={subsite} />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium text-foreground">
                      {subsite.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {description}
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
