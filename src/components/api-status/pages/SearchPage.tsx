import { cn } from '@/lib/utils';
import { useLang } from '@rspress/core/runtime';
import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { APIItem } from '../APIStatusDashboard';
import type { APIStats, DisplayPlatformName, FeatureInfo } from '../types';
import { CATEGORY_DISPLAY_NAMES } from '../types';

const i18n = {
  en: {
    searchPlaceholder: 'Search APIs by name or path…',
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
    showAll: 'Show all',
    showLess: 'Show less',
  },
  zh: {
    searchPlaceholder: '按名称或路径搜索 API…',
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
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

interface SearchPageProps {
  stats: APIStats;
  selectedPlatforms: DisplayPlatformName[];
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

  const shownFeatures = showAllResults
    ? filteredFeatures
    : filteredFeatures.slice(0, 100);
  const hasMoreResults = filteredFeatures.length > 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar — input + filter dropdowns wrapped in a single plate
          so they read as one surface. The plate picks up a brand-tinted
          focus ring when the user is typing. */}
      <div className="aps-search-bar">
        <div className="aps-search-input-wrap">
          <SearchIcon className="aps-search-input-icon" />
          <input
            type="search"
            className="aps-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px] border-transparent bg-transparent hover:bg-[color-mix(in_srgb,currentColor_6%,transparent)]">
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
          <Select
            value={stateFilter}
            onValueChange={(v) => setStateFilter(v as any)}
          >
            <SelectTrigger className="h-8 text-xs w-[120px] border-transparent bg-transparent hover:bg-[color-mix(in_srgb,currentColor_6%,transparent)]">
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

      {/* Results meta — quiet line above the grid */}
      <div className="aps-results-meta">
        <span>{t.apiList}</span>
        <div className="flex items-center gap-2">
          <span className="aps-results-meta__count">
            {shownFeatures.length} / {filteredFeatures.length} {t.matches}
          </span>
          {hasMoreResults && (
            <button
              onClick={() => setShowAllResults(!showAllResults)}
              className="aps-results-meta__action"
            >
              {showAllResults ? t.showLess : t.showAll}
            </button>
          )}
        </div>
      </div>

      {shownFeatures.length === 0 ? (
        <div className="aps-empty">{t.noResults}</div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5',
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
