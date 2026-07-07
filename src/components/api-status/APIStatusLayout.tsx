import React, { useState } from 'react';
import { useLang } from '@rspress/core/runtime';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { TooltipProvider } from '../ui/tooltip';
import { APIStatusSidebar, type PageType } from './APIStatusSidebar';
import { CategoriesPage } from './pages/CategoriesPage';
import { CoveragePage } from './pages/CoveragePage';
import { RecentPage } from './pages/RecentPage';
import { SearchPage } from './pages/SearchPage';
import {
  CLAY_PLATFORMS,
  NATIVE_PLATFORMS,
  type APIStats,
  type DisplayPlatformName,
} from './types';
import './APIStatusLayout.scss';

// Import the generated stats
import apiStats from '@lynx-js/lynx-compat-data/api-stats.json';

const stats = apiStats as APIStats;

// Per-page header copy. Each page gets a short subtitle that explains what
// the user is looking at — keeps the title bar load-bearing rather than
// decorative.
const PAGE_META: Record<
  PageType,
  { title: { en: string; zh: string }; sub: { en: string; zh: string } }
> = {
  search: {
    title: { en: 'Search APIs', zh: '搜索 API' },
    sub: {
      en: 'Filter by name, category, or support state.',
      zh: '按名称、分类或支持状态过滤。',
    },
  },
  coverage: {
    title: { en: 'Coverage trend', zh: '覆盖率趋势' },
    sub: {
      en: 'Per-platform parity and version-by-version progression.',
      zh: '按平台的覆盖率与版本演进。',
    },
  },
  categories: {
    title: { en: 'Categories', zh: '分类' },
    sub: {
      en: 'API surface area grouped by feature category.',
      zh: '按功能分类的 API 表面。',
    },
  },
  recent: {
    title: { en: 'Recently added', zh: '最近添加' },
    sub: {
      en: 'Latest APIs landed per platform, grouped by version.',
      zh: '各平台最新发布的 API，按版本分组。',
    },
  },
};

export const APIStatusLayout: React.FC = () => {
  if (import.meta.env.SSG_MD) {
    // TODO: support SSG-MD
    return <>{'APIStatusLayout'}</>;
  }
  // Shared state for platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    DisplayPlatformName[]
  >(['android', 'ios']);
  const [showClayDetails, setShowClayDetails] = useState(false);

  // Page navigation state
  const [activePage, setActivePage] = useState<PageType>('search');
  const lang = useLang();
  const t = lang === 'zh' ? 'zh' : 'en';

  const renderPage = () => {
    switch (activePage) {
      case 'search':
        return (
          <SearchPage stats={stats} selectedPlatforms={selectedPlatforms} />
        );
      case 'coverage':
        return (
          <CoveragePage stats={stats} selectedPlatforms={selectedPlatforms} />
        );
      case 'categories':
        return (
          <CategoriesPage stats={stats} selectedPlatforms={selectedPlatforms} />
        );
      case 'recent':
        return (
          <RecentPage stats={stats} selectedPlatforms={selectedPlatforms} />
        );
      default:
        return (
          <SearchPage stats={stats} selectedPlatforms={selectedPlatforms} />
        );
    }
  };

  const meta = PAGE_META[activePage];
  const updatedDate = stats.generated_at
    ? new Date(stats.generated_at).toLocaleDateString(
        t === 'zh' ? 'zh-CN' : 'en-US',
        { month: 'short', day: 'numeric', year: 'numeric' },
      )
    : undefined;

  // The header's right-side meta strip shows which platforms drive the
  // current view + their share of the total API surface. Reads as a quick
  // "what am I looking at" line without forcing the user back to the rail.
  // Mirror the sidebar rail's logic: in aggregate Clay mode the user sees
  // N native + 1 clay aggregate cell; in detail mode N native + 4 clay_*
  // sub-cells. The header's denominator should match what the rail shows,
  // or "X of Y platforms" would disagree with the sidebar's "X/Y" count.
  const surfaceCount = selectedPlatforms.length;
  const visibleNativeCount = NATIVE_PLATFORMS.filter(
    (p) => stats.summary.by_platform[p],
  ).length;
  const visibleClayCount = showClayDetails
    ? CLAY_PLATFORMS.filter((p) => stats.summary.by_platform[p]).length
    : stats.summary.by_platform['clay']
      ? 1
      : 0;
  const totalSurfaces = visibleNativeCount + visibleClayCount;

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={true}
        style={{ minHeight: '0', height: '100%' }}
      >
        <APIStatusSidebar
          stats={stats}
          selectedPlatforms={selectedPlatforms}
          onPlatformsChange={setSelectedPlatforms}
          showClayDetails={showClayDetails}
          onShowClayDetailsChange={setShowClayDetails}
          activePage={activePage}
          onPageChange={setActivePage}
        />
        <SidebarInset className="overflow-hidden min-h-0">
          {/* Header — title bar with brand-stem accent + meta strip. The
              left block holds the trigger, page title, and short subtitle;
              the right block surfaces the dataset stats so the user always
              knows the scale of what they're filtering against. */}
          <header className="aps-header">
            <SidebarTrigger className="aps-header__trigger" />
            <div className="aps-header__title-block">
              <div className="aps-header__title-row">
                <h1 className="aps-header__title">{meta.title[t]}</h1>
                <span className="aps-header__brand-stem" aria-hidden />
              </div>
              <p className="aps-header__sub">{meta.sub[t]}</p>
            </div>
            {/* Single quiet meta line — no mono-uppercase double-cell stat
                strip (that would be a mini hero-metric pattern). Body weight,
                muted color, dots between fragments for rhythm. */}
            <p className="aps-header__meta-line">
              {updatedDate && (
                <>
                  <span>
                    {t === 'zh' ? '更新于' : 'Updated'} {updatedDate}
                  </span>
                  <span className="aps-header__meta-sep" aria-hidden>
                    ·
                  </span>
                </>
              )}
              <span>
                {t === 'zh'
                  ? `${surfaceCount} / ${totalSurfaces} 平台`
                  : `${surfaceCount} of ${totalSurfaces} platforms`}
              </span>
            </p>
          </header>

          {/* Page content */}
          <main className="aps-main">{renderPage()}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default APIStatusLayout;
