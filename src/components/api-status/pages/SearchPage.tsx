import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import React, { useMemo, useState } from 'react';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { APIItem } from '../APIStatusDashboard';
import type { APIStats, FeatureInfo } from '../types';
import { CATEGORY_DISPLAY_NAMES } from '../types';

const i18n = {
  en: {
    searchPlaceholder: 'Search APIs...',
    category: 'Category',
    state: 'State',
    all: 'All',
    supported: 'Supported',
    unsupported: 'Unsupported',
    showing: 'Showing',
    of: 'of',
    matches: 'results',
    apiList: 'API List',
    noResults: 'No APIs match the current filters',
    showAll: 'Show All',
    showLess: 'Show Less',
  },
  zh: {
    searchPlaceholder: '搜索 API...',
    category: '分类',
    state: '状态',
    all: '全部',
    supported: '已支持',
    unsupported: '未支持',
    showing: '显示',
    of: '/',
    matches: '条结果',
    apiList: 'API 列表',
    noResults: '没有匹配当前筛选条件的 API',
    showAll: '显示全部',
    showLess: '收起',
  },
};

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface SearchPageProps {
  stats: APIStats;
  selectedPlatforms: PlatformName[];
}

export const SearchPage: React.FC<SearchPageProps> = ({
  stats,
  selectedPlatforms,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<
    'all' | 'supported' | 'unsupported'
  >('all');
  const [showAllResults, setShowAllResults] = useState(false);

  const { categories, features } = stats;
  const categoryOptions = ['all', ...Object.keys(categories)];

  // Unified filtering for all API displays
  const filteredFeatures = useMemo(() => {
    if (!features) return [];
    const q = searchQuery.trim().toLowerCase();
    return features.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter)
        return false;
      if (
        q &&
        !f.query.toLowerCase().includes(q) &&
        !f.name.toLowerCase().includes(q)
      )
        return false;
      if (stateFilter !== 'all') {
        // Check support across all selected platforms
        const supportedCount = selectedPlatforms.filter((p) => {
          const s = f.support[p];
          return (
            s?.version_added !== false &&
            s?.version_added !== undefined &&
            s?.version_added !== null
          );
        }).length;
        const isSupported = supportedCount === selectedPlatforms.length;

        if (stateFilter === 'supported' && !isSupported) return false;
        if (stateFilter === 'unsupported' && isSupported) return false;
      }
      return true;
    });
  }, [features, searchQuery, categoryFilter, stateFilter, selectedPlatforms]);

  // Show up to 100 features by default, or all if user requests
  const shownFeatures = showAllResults
    ? filteredFeatures
    : filteredFeatures.slice(0, 100);
  const hasMoreResults = filteredFeatures.length > 100;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none sm:w-[140px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t.category} />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c === 'all' ? t.all : CATEGORY_DISPLAY_NAMES[c] || c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 sm:flex-none sm:w-[120px]">
            <Select
              value={stateFilter}
              onValueChange={(v) => setStateFilter(v as any)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t.state} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  {t.all}
                </SelectItem>
                <SelectItem value="supported" className="text-xs">
                  {t.supported}
                </SelectItem>
                <SelectItem value="unsupported" className="text-xs">
                  {t.unsupported}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {t.apiList}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t.showing} {shownFeatures.length} {t.of} {filteredFeatures.length}{' '}
            {t.matches}
          </span>
          {hasMoreResults && (
            <button
              onClick={() => setShowAllResults(!showAllResults)}
              className="text-xs text-primary hover:underline font-medium"
            >
              {showAllResults ? t.showLess : t.showAll}
            </button>
          )}
        </div>
      </div>

      {/* API Grid */}
      {shownFeatures.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-lg">
          {t.noResults}
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 pr-1',
          )}
        >
          {shownFeatures.map((f) => (
            <APIItem
              key={f.id}
              query={f.query}
              name={f.name}
              category={f.category}
              selectedPlatforms={selectedPlatforms}
              support={f.support}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
