import type { PlatformName } from '@lynx-js/lynx-compat-data';
import React, { useState } from 'react';
import { TooltipProvider } from '../ui/tooltip';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { APIStatusSidebar, type PageType } from './APIStatusSidebar';
import { SearchPage } from './pages/SearchPage';
import { CoveragePage } from './pages/CoveragePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { RecentPage } from './pages/RecentPage';
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
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformName>('android');
  const [showClay, setShowClay] = useState(false);

  // Page navigation state
  const [activePage, setActivePage] = useState<PageType>('search');

  // Render the active page content
  const renderPage = () => {
    switch (activePage) {
      case 'search':
        return <SearchPage stats={stats} selectedPlatform={selectedPlatform} />;
      case 'coverage':
        return (
          <CoveragePage stats={stats} selectedPlatform={selectedPlatform} />
        );
      case 'categories':
        return (
          <CategoriesPage
            stats={stats}
            selectedPlatform={selectedPlatform}
            showClay={showClay}
          />
        );
      case 'recent':
        return <RecentPage stats={stats} selectedPlatform={selectedPlatform} />;
      default:
        return <SearchPage stats={stats} selectedPlatform={selectedPlatform} />;
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
          selectedPlatform={selectedPlatform}
          onPlatformChange={setSelectedPlatform}
          showClay={showClay}
          onShowClayChange={setShowClay}
          activePage={activePage}
          onPageChange={setActivePage}
        />
        <SidebarInset className="overflow-hidden min-h-0">
          {/* Header with sidebar trigger */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" />
            <h1 className="text-sm font-semibold">
              {PAGE_TITLES[activePage]?.en || 'API Status'}
            </h1>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-4">{renderPage()}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default APIStatusLayout;
