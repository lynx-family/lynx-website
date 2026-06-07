import { cn } from '@/lib/utils';
import { useLang } from '@rspress/core/runtime';
import React from 'react';
import { APIItem } from '../APIStatusDashboard';
import { PLATFORM_CONFIG } from '../constants';
import type { APIStats, DisplayPlatformName, FeatureInfo } from '../types';

const PlatformIcon: React.FC<{
  platform: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ platform, className, style }) => {
  const Icon = PLATFORM_CONFIG[platform]?.icon;
  return Icon ? <Icon className={className} style={style} /> : null;
};

const platformVars = (platform: string): React.CSSProperties => {
  const line =
    PLATFORM_CONFIG[platform]?.colors.line ||
    PLATFORM_CONFIG.android.colors.line;
  return { ['--platform' as any]: line };
};

const i18n = {
  en: {
    title: 'Recently Added',
    noApis: 'No recent APIs for',
    apis: 'APIs',
    eyebrow: 'New on',
  },
  zh: {
    title: '最近添加',
    noApis: '没有最近添加的 API 适用于',
    apis: '个 API',
    eyebrow: '新增于',
  },
};

interface RecentPageProps {
  stats: APIStats;
  selectedPlatforms: DisplayPlatformName[];
}

export const RecentPage: React.FC<RecentPageProps> = ({
  stats,
  selectedPlatforms,
}) => {
  const lang = useLang();
  const t = lang === 'zh' ? i18n.zh : i18n.en;

  const { recent_apis } = stats;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 items-start -mx-5 px-5 scrollbar-thin">
      {selectedPlatforms.map((platform) => {
        // Group recent APIs by version for the current platform
        const recentApisByVersion = (() => {
          const grouped: Record<string, FeatureInfo[]> = {};

          for (const api of recent_apis) {
            const version = api.versions[platform];
            if (!version || version === true) continue;

            const versionKey = String(version);
            if (!grouped[versionKey]) grouped[versionKey] = [];

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

        return (
          // Per-platform stat card — same lifted-card chrome as the
          // Coverage page, just wider (a stack of version-grouped APIs
          // lives inside each one).
          <article
            key={platform}
            className="aps-stat-card"
            style={{
              ...platformVars(platform),
              minWidth: 280,
              flex: '1 1 0',
              flexShrink: 0,
            }}
          >
            <header className="aps-stat-card__head">
              <PlatformIcon
                platform={platform}
                className="aps-stat-card__icon"
              />
              <span className="aps-stat-card__label">
                {PLATFORM_CONFIG[platform]?.label || platform}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--rp-font-mono, ui-monospace, monospace)',
                  fontSize: 10.5,
                  fontWeight: 500,
                  opacity: 0.75,
                  color: 'inherit',
                }}
              >
                {totalCount} {t.apis}
              </span>
            </header>

            <div>
              {recentApisByVersion.length === 0 ? (
                <div className="aps-empty">
                  {t.noApis} {PLATFORM_CONFIG[platform]?.label || platform}
                </div>
              ) : (
                recentApisByVersion.map(({ version, apis }) => (
                  <div key={version} className="aps-version-block">
                    <div className="aps-version-block__head">
                      <span className="aps-version-chip">v{version}</span>
                      <span className="aps-version-block__count">
                        {apis.length} {t.apis}
                      </span>
                      <span className="aps-version-block__rule" />
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
                          selectedPlatforms={[platform]}
                          support={f.support}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default RecentPage;
