/**
 * Compatibility Badge
 *
 * TODO(xuan.huang): Similar to `APITable`, the "smart" version of
 * badge need to access `platforms.json` to gather name for each platform.
 * - useSWR or a shared contextual store to ensure we are not over-fetching.
 */
import type LCD from '@lynx-js/lynx-compat-data';
import { getNestedValue } from '../api-table/helpers';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
export * as Platform from './PlatformBadge';

type CompatibilityBadgeProps = {
  query?: string;
  data: LCD.Identifier;
  showStatus?: boolean;
  showPlatform?: boolean;
  showVersion?: boolean;
};

function getStatusBadges(compatData: LCD.CompatStatement): React.ReactNode[] {
  const badges: React.ReactNode[] = [];
  if (compatData?.status?.experimental)
    badges.push(<StatusBadge status="experimental" />);
  if (compatData?.status?.deprecated)
    badges.push(<StatusBadge status="deprecated" />);
  return badges;
}

function getPlatformBadges(
  compatData: LCD.CompatStatement,
  showVersion: boolean,
): React.ReactNode[] {
  return Object.entries(compatData.support)
    .filter(([, support]) => {
      const supportStatement = Array.isArray(support) ? support[0] : support;
      return (
        typeof supportStatement === 'object' && supportStatement.version_added
      );
    })
    .map(([p, support]) => {
      const supportStatement = Array.isArray(support) ? support[0] : support;
      // assert the type of platform from LCD because it's validated during its build.
      const platform = p as LCD.PlatformName;
      if (showVersion) {
        return (
          <PlatformBadge
            key={platform}
            platform={platform}
            version={supportStatement.version_added}
          />
        );
      }
      return <PlatformBadge key={platform} platform={platform} />;
    });
}

/**
 * Badge that displays the compatibility of an API by
 * querying the @param query.
 * A smarter version of badge can access data without @param data
 * @returns
 */
export function APIBadge({
  query = undefined,
  data,
  showPlatform = true,
  showVersion = true,
  showStatus = true,
}: CompatibilityBadgeProps) {
  if (!data || !Object.keys(data).length) {
    throw new Error('CompatibilityBadge component called with empty data');
  }

  const feature = query ? getNestedValue(data, query) : data;
  if (!feature || !feature['__compat']) {
    throw new Error(
      `CompatibilityBadge component called with invalid query: ${query}`,
    );
  }

  const compatData = feature['__compat'] as LCD.CompatStatement;
  const badges: React.ReactNode[] = [
    ...(showStatus ? getStatusBadges(compatData) : []),
    ...(showPlatform ? getPlatformBadges(compatData, showVersion) : []),
  ];

  return (
    <span className="sh-inline-flex sh-flex-wrap sh-items-center sh-gap-1 sh-align-middle">
      {badges}
    </span>
  );
}
