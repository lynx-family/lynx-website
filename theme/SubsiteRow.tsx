import { useEffect, useRef, useState } from 'react';
import { useLang, useLocation, useNavigate } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CORE_SUBSITES,
  QUICK_START_PATH,
  getLangPrefix,
} from '@site/shared-route-config';
import type { SubsiteConfig } from '@site/shared-route-config';
import { cn } from '@/lib/utils';

import { SubsiteLogo } from './subsite-ui';
import './SubsiteRow.scss';

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
  const quickStartHref = `${getLangPrefix(lang)}${QUICK_START_PATH}`;
  // Quick Start is the single most-clicked entry on the docs — every
  // Lynx-family journey passes through it — so the CTA stays mounted on
  // every page, above the subsite icon row. When the reader IS on Quick
  // Start, it picks up a solid brand wash + a stem dropping down to the
  // active Lynx icon below, so the pair reads as one compound element.
  const isOnQuickStart = pathname
    .replace(/\.html$/, '')
    .endsWith(QUICK_START_PATH);

  // Track horizontal scroll on the icon row so the stem can retract when
  // Lynx scrolls off-start. The stem is positioned inside the CTA (above
  // the scroll container, in a different stacking context), so it can't
  // follow Lynx visually via overflow — and `overflow-x: auto` implicitly
  // clips overflow-y, ruling out a vertical stem element inside the row.
  // Fading on scroll is the honest move: when Lynx isn't at the start
  // anymore, the connection is broken, so we acknowledge it.
  const rowRef = useRef<HTMLDivElement>(null);
  const [isRowScrolled, setIsRowScrolled] = useState(false);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    // 4px threshold absorbs subpixel jitter and the natural overscroll
    // bounce on touchpads — the stem shouldn't blink during a 1px wobble.
    const onScroll = () => setIsRowScrolled(el.scrollLeft > 4);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <Link
        href={quickStartHref}
        aria-current={isOnQuickStart ? 'page' : undefined}
        className={cn(
          'quick-start-cta',
          isOnQuickStart && 'quick-start-cta--active',
          isOnQuickStart && isRowScrolled && 'quick-start-cta--row-scrolled',
        )}
      >
        {/* Animated gradient border — reused mask trick from the original
            SubsiteSwitcher dropdown trigger. Lives behind the content. */}
        <span className="quick-start-cta__shine" aria-hidden="true" />
        <span className="quick-start-cta__label">
          {lang === 'zh' ? '开始使用' : 'Get Started'}
        </span>
        <svg
          className="quick-start-cta__arrow"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isOnQuickStart && (
          <span className="quick-start-cta__stem" aria-hidden="true" />
        )}
      </Link>
      <div
        ref={rowRef}
        role="navigation"
        aria-label="Subsite switcher"
        className="subsite-row-scroll"
      >
        {CORE_SUBSITES.map((subsite) => {
          const isActive = subsite.value === current.value;
          const description =
            lang === 'zh' ? subsite.descriptionZh : subsite.description;
          // Lynx is the platform every other subsite is defined relative to,
          // so its "subsite landing" is the same Quick Start page everyone
          // gets sent to. The other subsites land on their own intro page.
          const target =
            subsite.value === 'guide' ? QUICK_START_PATH : subsite.url;
          return (
            <Tooltip key={subsite.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => navigate(`${getLangPrefix(lang)}${target}`)}
                  aria-label={subsite.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'subsite-icon',
                    isActive && 'subsite-icon--active',
                  )}
                >
                  <span className="subsite-icon__logo">
                    <SubsiteLogo subsite={subsite} />
                  </span>
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
