import { cn } from '@/lib/utils';
import { useLang } from '@rspress/core/runtime';
import React, { useState } from 'react';
import { CategoryTable, type HighlightMode } from '../CategoryTable';
import type { APIStats, DisplayPlatformName } from '../types';

const i18n = {
  en: {
    highlightGood: 'Highlight good',
    highlightBad: 'Highlight gaps',
    highlight: 'Highlight',
    legend: 'Per-platform coverage by category. Click a row to expand.',
  },
  zh: {
    highlightGood: '高亮已支持',
    highlightBad: '高亮缺失',
    highlight: '高亮',
    legend: '按分类的各平台覆盖情况。点击行可展开详情。',
  },
};

interface CategoriesPageProps {
  stats: APIStats;
  selectedPlatforms: DisplayPlatformName[];
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  stats,
  selectedPlatforms,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('green');

  const { categories } = stats;

  return (
    // Flat layout — no plate wrapper. CategoryTable already carries its
    // own structure (header row, group eyebrow, zebra rows, dividers).
    // Wrapping it in a plate stacks outer border + bg tint on top, which
    // reads as busy and gray. Instead: bare header row above the table.
    <div className="aps-cat">
      <div className="aps-cat__head">
        <p className="aps-cat__legend">{t.legend}</p>
        <div className="aps-pill-group" role="group" aria-label={t.highlight}>
          <button
            type="button"
            onClick={() => setHighlightMode('green')}
            style={
              highlightMode === 'green'
                ? { ['--tint' as any]: 'hsl(var(--status-supported))' }
                : undefined
            }
            className={cn(
              'aps-pill',
              highlightMode === 'green' && 'aps-pill--active',
            )}
          >
            {t.highlightGood}
          </button>
          <button
            type="button"
            onClick={() => setHighlightMode('red')}
            style={
              highlightMode === 'red'
                ? { ['--tint' as any]: 'hsl(var(--status-unsupported))' }
                : undefined
            }
            className={cn(
              'aps-pill',
              highlightMode === 'red' && 'aps-pill--active',
            )}
          >
            {t.highlightBad}
          </button>
        </div>
      </div>
      <CategoryTable
        categories={categories}
        categoryGroups={stats.category_groups}
        selectedPlatforms={selectedPlatforms}
        expandedCategory={expandedCategory}
        onCategoryClick={(cat) =>
          setExpandedCategory(expandedCategory === cat ? null : cat)
        }
        highlightMode={highlightMode}
      />
    </div>
  );
};

export default CategoriesPage;
