import { cn } from '@/lib/utils';
import { useLang, withBase } from '@rspress/core/runtime';
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '../ui/sidebar';
import { PLATFORM_CONFIG } from './constants';
import {
  CLAY_PLATFORMS,
  NATIVE_PLATFORMS,
  type APIStats,
  type DisplayPlatformName,
} from './types';
import './APIStatusSidebar.scss';

// ─── Local icon set ──────────────────────────────────────────────────────
// Stroke icons used for the page nav rail and footer. Kept lightweight —
// matching the 1.75px stroke vocabulary the rest of the docs sidebar uses.

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const LayersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12.5-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12.5" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const HelpCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Page model ──────────────────────────────────────────────────────────
export type PageType = 'search' | 'coverage' | 'categories' | 'recent';

interface PageConfig {
  id: PageType;
  label: { en: string; zh: string };
  icon: React.FC<{ className?: string }>;
}

const PAGES: PageConfig[] = [
  {
    id: 'search',
    label: { en: 'Search APIs', zh: '搜索 API' },
    icon: SearchIcon,
  },
  {
    id: 'categories',
    label: { en: 'Categories', zh: '分类' },
    icon: LayersIcon,
  },
  {
    id: 'coverage',
    label: { en: 'Coverage trend', zh: '覆盖率趋势' },
    icon: TrendingUpIcon,
  },
  {
    id: 'recent',
    label: { en: 'Recently added', zh: '最近添加' },
    icon: SparklesIcon,
  },
];

// ─── Platform icon (bg-mask via PLATFORM_CONFIG icon component) ──────────
const PlatformIcon: React.FC<{
  platform: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ platform, className, style }) => {
  const Icon = PLATFORM_CONFIG[platform]?.icon;
  return Icon ? <Icon className={className} style={style} /> : null;
};

// Each cell carries its own brand color through the `--platform` CSS var,
// so the active wash, border, glow, and % all track from one source.
const platformVars = (platform: string): React.CSSProperties => {
  const line =
    PLATFORM_CONFIG[platform]?.colors.line ||
    PLATFORM_CONFIG.android.colors.line;
  return { ['--platform' as any]: line };
};

interface APIStatusSidebarProps {
  stats: APIStats;
  selectedPlatforms: DisplayPlatformName[];
  onPlatformsChange: (platforms: DisplayPlatformName[]) => void;
  showClayDetails: boolean;
  onShowClayDetailsChange: (show: boolean) => void;
  activePage: PageType;
  onPageChange: (page: PageType) => void;
}

export const APIStatusSidebar: React.FC<APIStatusSidebarProps> = ({
  stats,
  selectedPlatforms,
  onPlatformsChange,
  showClayDetails,
  onShowClayDetailsChange,
  activePage,
  onPageChange,
}) => {
  const { state } = useSidebar();
  const lang = useLang();
  const isCollapsed = state === 'collapsed';

  // Colorblind mode flips a class on <html> so the existing color-blind
  // palette (defined elsewhere) takes over. Kept identical to the previous
  // sidebar's behavior.
  const [isColorblindMode, setIsColorblindMode] = React.useState(false);
  React.useEffect(() => {
    if (isColorblindMode) {
      document.documentElement.classList.add('colorblind-mode');
    } else {
      document.documentElement.classList.remove('colorblind-mode');
    }
  }, [isColorblindMode]);

  // Toggle selection. Keep at least one platform on so the dashboard has
  // something to render — clearing the last item is a no-op.
  const togglePlatform = (platform: DisplayPlatformName) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length > 1) {
        onPlatformsChange(selectedPlatforms.filter((p) => p !== platform));
      }
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  // Clay aggregate ↔ Clay 4-detail toggle. Same migration logic as before:
  // swap the aggregate id for the four sub-platform ids (or vice versa) so
  // the user's selection survives the view change.
  const toggleClayDetails = () => {
    if (!showClayDetails) {
      const hasClayAggregate = selectedPlatforms.includes('clay');
      const withoutClay = selectedPlatforms.filter((p) => p !== 'clay');
      onPlatformsChange(
        hasClayAggregate
          ? [...withoutClay, ...CLAY_PLATFORMS]
          : withoutClay.length > 0
            ? withoutClay
            : ['web_lynx'],
      );
    } else {
      const hasAnyClayDetail = selectedPlatforms.some((p) =>
        CLAY_PLATFORMS.includes(p as any),
      );
      const withoutClayDetails = selectedPlatforms.filter(
        (p) => !CLAY_PLATFORMS.includes(p as any),
      );
      onPlatformsChange(
        hasAnyClayDetail
          ? [...withoutClayDetails, 'clay']
          : withoutClayDetails.length > 0
            ? withoutClayDetails
            : ['web_lynx'],
      );
    }
    onShowClayDetailsChange(!showClayDetails);
  };

  const selectAll = () => {
    const allVisible: DisplayPlatformName[] = showClayDetails
      ? [...NATIVE_PLATFORMS, ...CLAY_PLATFORMS]
      : [...NATIVE_PLATFORMS, 'clay'];
    onPlatformsChange(allVisible.filter((p) => stats.summary.by_platform[p]));
  };
  const clearSelection = () => {
    onPlatformsChange([NATIVE_PLATFORMS[0]]);
  };

  const updatedDate = stats.generated_at
    ? new Date(stats.generated_at).toLocaleDateString(
        lang === 'zh' ? 'zh-CN' : 'en-US',
        { month: 'short', day: 'numeric' },
      )
    : undefined;

  const visibleNative = NATIVE_PLATFORMS.filter(
    (p) => stats.summary.by_platform[p],
  );
  const hasClay = !!stats.summary.by_platform['clay'];
  const railCols = visibleNative.length + (hasClay ? 1 : 0);
  const clayColor = PLATFORM_CONFIG.clay?.colors.line || '#14b8a6';

  // Total visible platforms accounts for the clay aggregate (1) vs the
  // four sub-platforms when expanded, so the X/Y count stays truthful.
  const totalVisible = showClayDetails
    ? visibleNative.length +
      CLAY_PLATFORMS.filter((p) => stats.summary.by_platform[p]).length
    : railCols;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    // The sidebar container is positioned `fixed` by shadcn at `top-14`
    // (56px) — that assumes a 56px-tall top nav. rspress's nav on this
    // site is 64px tall, so override to `top-16` so the sidebar's top
    // edge aligns with the SidebarInset's top edge on the right. Without
    // this the two header bars would be at different Y positions.
    <Sidebar collapsible="icon" className="!top-16">
      {/* Header — title + total + status chip (matches the homepage typographic
          rhythm: 14px / 600 / -0.01em title, mono caption, brand-tinted pill) */}
      {/* Sidebar header — Tailwind utilities override shadcn's flex-col
          gap-2 p-2 defaults so the bar lays out as a 64px-tall single row
          (same as the page header on the right). The .aps-side-header
          class adds the bottom border + dark-mode tints. */}
      <SidebarHeader className="aps-side-header !flex-row !items-center !h-16 !p-0 !px-4 !gap-2">
        <div className="aps-heading">
          <div className="aps-heading__title">
            <span>Lynx API Status</span>
            <span className="aps-heading__total">
              {stats.summary.platform_api_total.toLocaleString()}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Page nav — full-width lifted-card rows. Active row picks up
            --rp-c-brand wash + brand-tinted icon; no chevron caret (the
            wash + bold text already say "active"). No "PAGES" eyebrow
            label — the icon + label per row is self-evidently a nav. */}
        <div className="aps-section">
          <div className="aps-pages">
            {PAGES.map((page) => {
              const isActive = activePage === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onPageChange(page.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={
                    isCollapsed
                      ? page.label[lang === 'zh' ? 'zh' : 'en']
                      : undefined
                  }
                  className={cn('aps-page', isActive && 'aps-page--active')}
                >
                  <span className="aps-page__icon">
                    <page.icon className="w-full h-full" />
                  </span>
                  <span className="aps-page__label">
                    {page.label[lang === 'zh' ? 'zh' : 'en']}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform rail — icon cells with coverage % below. The whole
            grammar is one .aps-cell class that reads its brand color from
            a CSS var, so adding a platform is just adding a config entry. */}
        <div className="aps-section">
          <div className="aps-section-head">
            <span>
              Platforms{' '}
              <span className="aps-section-count">
                {selectedPlatforms.length}/{totalVisible}
              </span>
            </span>
            <div className="aps-section-actions">
              <button
                type="button"
                className="aps-section-action"
                onClick={selectAll}
              >
                All
              </button>
              <button
                type="button"
                className="aps-section-action"
                onClick={clearSelection}
              >
                One
              </button>
            </div>
          </div>

          <div
            className="aps-rail"
            style={{ ['--rail-cols' as any]: railCols }}
          >
            {visibleNative.map((platform) => {
              const ps = stats.summary.by_platform[platform];
              if (!ps) return null;
              const isSelected = selectedPlatforms.includes(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  aria-pressed={isSelected}
                  title={`${PLATFORM_CONFIG[platform]?.label} ${ps.coverage_percent}%`}
                  className={cn('aps-cell', isSelected && 'aps-cell--active')}
                  style={platformVars(platform)}
                >
                  <PlatformIcon
                    platform={platform}
                    className="aps-cell__icon"
                  />
                  <span className="aps-cell__pct">{ps.coverage_percent}%</span>
                </button>
              );
            })}

            {hasClay && !showClayDetails && (
              <button
                key="clay"
                type="button"
                onClick={() => togglePlatform('clay')}
                aria-pressed={selectedPlatforms.includes('clay')}
                title={`Clay ${stats.summary.by_platform.clay?.coverage_percent}%`}
                className={cn(
                  'aps-cell',
                  selectedPlatforms.includes('clay') && 'aps-cell--active',
                )}
                style={platformVars('clay')}
              >
                <PlatformIcon platform="clay" className="aps-cell__icon" />
                <span className="aps-cell__pct">
                  {stats.summary.by_platform.clay?.coverage_percent}%
                </span>
              </button>
            )}
          </div>

          {/* Clay detail toggle — discoverable affordance below the rail.
              The button reads "Show Clay surfaces ↓" when collapsed and
              "Hide Clay surfaces ↑" when expanded. Tinted teal so it
              visually belongs to the Clay cell above. */}
          {hasClay && (
            <button
              type="button"
              onClick={toggleClayDetails}
              className={cn(
                'aps-clay-toggle',
                showClayDetails && 'aps-clay-toggle--open',
              )}
              style={{ ['--clay-tint' as any]: clayColor }}
              aria-expanded={showClayDetails}
            >
              <span className="aps-clay-toggle__label">
                {showClayDetails
                  ? lang === 'zh'
                    ? '收起 Clay 子平台'
                    : 'Hide Clay surfaces'
                  : lang === 'zh'
                    ? '展开 Clay 子平台'
                    : 'Show Clay surfaces'}
              </span>
              <ChevronDownIcon className="aps-clay-toggle__icon" />
            </button>
          )}

          {/* Clay detail tray — animated open via grid-template-rows so the
              row above stays put and content reflows from zero height. */}
          {hasClay && (
            <div
              className={cn('aps-tray', showClayDetails && 'aps-tray--open')}
              aria-hidden={!showClayDetails}
              style={{ ['--clay-tint' as any]: clayColor }}
            >
              <div className="aps-tray__inner">
                <div className="aps-tray__body">
                  <div className="aps-rail">
                    {CLAY_PLATFORMS.map((platform) => {
                      const ps = stats.summary.by_platform[platform];
                      if (!ps) return null;
                      const isSelected = selectedPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          aria-pressed={isSelected}
                          title={`${PLATFORM_CONFIG[platform]?.label} ${ps.coverage_percent}%`}
                          className={cn(
                            'aps-cell',
                            isSelected && 'aps-cell--active',
                          )}
                          style={platformVars(platform)}
                        >
                          <PlatformIcon
                            platform={platform}
                            className="aps-cell__icon"
                          />
                          <span className="aps-cell__pct">
                            {ps.coverage_percent}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarContent>

      {/* Footer utilities — colorblind toggle + help link. Same row vocabulary
          as page nav but lighter — no brand wash by default, no caret. */}
      <SidebarFooter className="p-0">
        <div className="aps-foot">
          <button
            type="button"
            onClick={() => setIsColorblindMode((v) => !v)}
            className={cn(
              'aps-foot-row',
              isColorblindMode && 'aps-foot-row--on',
            )}
            title={lang === 'zh' ? '色盲模式' : 'Colorblind mode'}
          >
            <span className="aps-foot-row__icon">
              <EyeIcon className="w-full h-full" />
            </span>
            <span className="aps-foot-row__label">
              {lang === 'zh' ? '色盲模式' : 'Colorblind mode'}
            </span>
            {isColorblindMode && <span className="aps-foot-row__meta">ON</span>}
          </button>
          <a
            href={withBase(
              lang === 'zh' ? '/zh/help/dashboard' : '/help/dashboard',
            )}
            className="aps-foot-row"
            title={lang === 'zh' ? '帮助' : 'Help'}
          >
            <span className="aps-foot-row__icon">
              <HelpCircleIcon className="w-full h-full" />
            </span>
            <span className="aps-foot-row__label">
              {lang === 'zh' ? '帮助' : 'Help'}
            </span>
            {updatedDate && (
              <span className="aps-foot-row__meta">{updatedDate}</span>
            )}
          </a>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default APIStatusSidebar;
