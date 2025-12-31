import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { CategoryTable, type HighlightMode } from '../CategoryTable';
import type { APIStats } from '../types';

const i18n = {
  en: {
    title: 'Categories',
    highlightGood: 'Highlight Good',
    highlightBad: 'Highlight Gaps',
  },
  zh: {
    title: '分类',
    highlightGood: '高亮已支持',
    highlightBad: '高亮缺失',
  },
};

const LayersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12.5-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12.5" />
  </svg>
);

interface CategoriesPageProps {
  stats: APIStats;
  selectedPlatforms: PlatformName[];
  showClay: boolean;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  stats,
  selectedPlatforms,
  showClay,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('green');

  const { categories } = stats;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1 bg-background/50 border rounded-md p-0.5 ml-auto">
          <button
            onClick={() => setHighlightMode('green')}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-all',
              highlightMode === 'green'
                ? 'bg-status-supported/20 text-status-supported-strong'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.highlightGood}
          </button>
          <button
            onClick={() => setHighlightMode('red')}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-all',
              highlightMode === 'red'
                ? 'bg-status-unsupported/20 text-status-unsupported-strong'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.highlightBad}
          </button>
        </div>
      </div>
      <div className="p-0">
        <CategoryTable
          categories={categories}
          showClay={showClay}
          selectedPlatforms={selectedPlatforms}
          expandedCategory={expandedCategory}
          onCategoryClick={(cat) =>
            setExpandedCategory(expandedCategory === cat ? null : cat)
          }
          highlightMode={highlightMode}
        />
      </div>
    </div>
  );
};

export default CategoriesPage;
