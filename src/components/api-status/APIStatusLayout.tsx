import type { PlatformName } from '@lynx-js/lynx-compat-data';
import React, { useState } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { TooltipProvider } from '../ui/tooltip';
import { APIStatusSidebar, type PageType } from './APIStatusSidebar';
import { CategoriesPage } from './pages/CategoriesPage';
import { CoveragePage } from './pages/CoveragePage';
import { RecentPage } from './pages/RecentPage';
import { SearchPage } from './pages/SearchPage';
import type { APIStats } from './types';

// Import the generated stats
import apiStats from '@lynx-js/lynx-compat-data/api-stats.json';

const stats = apiStats as APIStats;

// Page titles for header
const PAGE_TITLES: Record<PageType, { en: string; zh: string }> = {
  search: { en: 'Search APIs', zh: '搜索 API' },
  coverage: { en: 'Platform Coverage', zh: '平台覆盖率' },
  categories: { en: 'API Categories', zh: 'API 分类' },
  recent: { en: 'Recently Added', zh: '最近添加' },
};

export const APIStatusLayout: React.FC = () => {
  // Shared state for platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformName[]>([
    'android',
    'ios',
  ]);
  const [showClay, setShowClay] = useState(false);

  // Page navigation state
  const [activePage, setActivePage] = useState<PageType>('search');

  // Render the active page content
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
          <CategoriesPage
            stats={stats}
            selectedPlatforms={selectedPlatforms}
            showClay={showClay}
          />
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
          showClay={showClay}
          onShowClayChange={setShowClay}
          activePage={activePage}
          onPageChange={setActivePage}
        />
        <SidebarInset className="overflow-hidden min-h-0">
          {/* Header with sidebar trigger */}
          <header className="flex gap-2 items-center px-4 h-14 border-b shrink-0">
            <SidebarTrigger className="-ml-1" />
            <div className="w-px h-4 bg-border" />
            <h1 className="text-sm font-semibold">
              {PAGE_TITLES[activePage]?.en || 'API Status'}
            </h1>
          </header>

          {/* Page content */}
          <main className="overflow-auto flex-1 p-4">{renderPage()}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default APIStatusLayout;
