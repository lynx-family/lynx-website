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
  selectedPlatform: PlatformName;
  showClay: boolean;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  stats,
  selectedPlatform,
  showClay,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('green');

  const { categories } = stats;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayersIcon className="w-5 h-5 text-primary" />
            {t.title}
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
            <button
              onClick={() => setHighlightMode('green')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-all',
                highlightMode === 'green'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.highlightGood}
            </button>
            <button
              onClick={() => setHighlightMode('red')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-all',
                highlightMode === 'red'
                  ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.highlightBad}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <CategoryTable
          categories={categories}
          showClay={showClay}
          selectedPlatform={selectedPlatform}
          expandedCategory={expandedCategory}
          onCategoryClick={(cat) =>
            setExpandedCategory(expandedCategory === cat ? null : cat)
          }
          highlightMode={highlightMode}
        />
      </CardContent>
    </Card>
  );
};

export default CategoriesPage;
