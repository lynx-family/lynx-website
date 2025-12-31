import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { useLang } from '@rspress/core/runtime';
import React from 'react';
import { Card, CardContent } from '../../ui/card';
import { APIItem } from '../APIStatusDashboard';
import { PLATFORM_CONFIG } from '../constants';
import type { APIStats, FeatureInfo } from '../types';

// Platform icons
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  const Icon = PLATFORM_CONFIG[platform]?.icon;
  return Icon ? <Icon className={className} /> : null;
};

const i18n = {
  en: {
    title: 'Recently Added',
    noApis: 'No recent APIs for',
    apis: 'APIs',
  },
  zh: {
    title: '最近添加',
    noApis: '没有最近添加的 API 适用于',
    apis: '个 API',
  },
};

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

interface RecentPageProps {
  stats: APIStats;
  selectedPlatforms: PlatformName[];
}

export const RecentPage: React.FC<RecentPageProps> = ({
  stats,
  selectedPlatforms,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const { recent_apis } = stats;

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 items-start -mx-4 px-4 scrollbar-thin">
      {selectedPlatforms.map((platform) => {
        // Group recent APIs by version for the current platform
        const recentApisByVersion = (() => {
          const grouped: Record<string, FeatureInfo[]> = {};

          for (const api of recent_apis) {
            const version = api.versions[platform];
            // Skip if no version for selected platform or version is false/null
            if (!version || version === true) continue;

            const versionKey = String(version);
            if (!grouped[versionKey]) {
              grouped[versionKey] = [];
            }

            grouped[versionKey].push({
              id: `recent-${api.path}-${platform}`,
              query: api.path,
              name: api.name,
              category: api.category,
              support: Object.fromEntries(
                Object.entries(api.versions).map(([k, v]) => [
                  k,
                  { version_added: v },
                ]),
              ) as FeatureInfo['support'],
            });
          }

          // Sort versions in descending order (newest first)
          const sortedVersions = Object.keys(grouped).sort((a, b) => {
            const parseVersion = (v: string) => {
              const parts = v.split('.').map(Number);
              return parts[0] * 1000 + (parts[1] || 0);
            };
            return parseVersion(b) - parseVersion(a);
          });

          return sortedVersions.map((version) => ({
            version,
            apis: grouped[version],
          }));
        })();

        const totalCount = recentApisByVersion.reduce(
          (sum, g) => sum + g.apis.length,
          0,
        );

        const colors =
          PLATFORM_CONFIG[platform]?.colors || PLATFORM_CONFIG.web_lynx.colors;

        return (
          <Card
            key={platform}
            className={cn(
              'min-w-[300px] flex-1 flex-shrink-0 transition-all',
              colors.bg,
              colors.border,
            )}
          >
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <PlatformIcon
                  platform={platform}
                  className={cn('w-4 h-4', colors.text)}
                />
                <span className={cn('text-sm font-medium', colors.text)}>
                  {PLATFORM_CONFIG[platform]?.label || platform}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  ({totalCount} APIs)
                </span>
              </div>

              <div className="space-y-6 pr-1 mt-2">
                {recentApisByVersion.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {t.noApis} {PLATFORM_CONFIG[platform]?.label || platform}
                  </div>
                ) : (
                  recentApisByVersion.map(({ version, apis }) => (
                    <div key={version}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono">
                          v{version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {apis.length} {t.apis}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div
                        className={cn(
                          'grid gap-1.5',
                          selectedPlatforms.length > 1
                            ? 'grid-cols-1'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                        )}
                      >
                        {apis.map((f) => (
                          <APIItem
                            key={f.id}
                            query={f.query}
                            name={f.name}
                            category={f.category}
                            selectedPlatforms={[platform]} // Show status for this platform
                            support={f.support}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RecentPage;
