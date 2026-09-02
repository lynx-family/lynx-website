/**
 * Compatibility Badge
 *
 * TODO(xuan.huang): Similar to `APITable`, the "smart" version of
 * badge need to access `platforms.json` to gather name for each platform.
 * - useSWR or a shared contextual store to ensure we are not over-fetching.
 */
import type LCD from '@lynx-js/lynx-compat-data';
import { ClayGroupBadge } from './ClayGroupBadge';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
export * as Platform from './PlatformBadge';

/**
 * How <APIBadge> renders the four Clay desktop variants (clay_android,
 * clay_ios, clay_macos, clay_windows). Configurable per deployment via
 * `process.env.APIBADGE_CLAY_MODE` and per call via the `clayMode` prop;
 * the prop wins.
 *
 *   collapsed   Group by version_added, render one "Desktop X+" chip per
 *               group via PlatformBadge with platform='clay'. Mirrors the
 *               visual of legacy hand-written <ClayOnly /> badges. Default
 *               for the OSS site.
 *   expanded    Render one PlatformBadge per variant ("Clay Android X+",
 *               "Clay iOS X+", ...). Maximum information density; default
 *               in the previous APIBadge implementation.
 *   expandable  Group by version_added, render one interactive
 *               ClayGroupBadge per group. Hover reveals the variant icons
 *               inline; click swaps the label to the full variant names.
 *               Intended for the inhouse build where the desktop branding
 *               is in flux and readers want to drill down on demand.
 */
export type ClayMode = 'collapsed' | 'expanded' | 'expandable';

const ENV_CLAY_MODE =
  (process.env.APIBADGE_CLAY_MODE as ClayMode | undefined) ?? 'expanded';

const CLAY_VARIANTS = [
  'clay_android',
  'clay_ios',
  'clay_macos',
  'clay_windows',
] as const satisfies readonly LCD.PlatformName[];

type ClayVariant = (typeof CLAY_VARIANTS)[number];

function isClayVariant(p: string): p is ClayVariant {
  return (CLAY_VARIANTS as readonly string[]).includes(p);
}

function getNestedValue(obj: any, query: string): any {
  return query.split('/').reduce((acc, key) => {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

type CompatibilityBadgeProps = {
  query?: string;
  data: LCD.Identifier;
  showStatus?: boolean;
  showPlatform?: boolean;
  showVersion?: boolean;
  clayMode?: ClayMode;
};

function getStatusBadges(compatData: LCD.CompatStatement): React.ReactNode[] {
  const badges: React.ReactNode[] = [];
  if (compatData?.status?.experimental)
    badges.push(<StatusBadge status="experimental" />);
  if (compatData?.status?.deprecated)
    badges.push(<StatusBadge status="deprecated" />);
  return badges;
}

function getSupportStatement(
  support: LCD.SupportStatement | undefined,
): LCD.SimpleSupportStatement | undefined {
  if (!support) return undefined;
  const statement = Array.isArray(support) ? support[0] : support;
  return typeof statement === 'object' ? statement : undefined;
}

// Bucket supported clay variants by their version_added, so each cohort with
// the same shipped version renders as one umbrella chip (collapsed) or one
// interactive group (expandable). `true` / `null` group separately from
// concrete strings so we don't lie about which versions agree.
function groupClayByVersion(
  compatData: LCD.CompatStatement,
): Map<string, { variants: ClayVariant[]; version: LCD.VersionValue }> {
  const groups = new Map<
    string,
    { variants: ClayVariant[]; version: LCD.VersionValue }
  >();
  for (const variant of CLAY_VARIANTS) {
    const statement = getSupportStatement(compatData.support?.[variant]);
    const versionAdded = statement?.version_added;
    if (!versionAdded) continue;
    const key = String(versionAdded);
    if (!groups.has(key))
      groups.set(key, { variants: [], version: versionAdded });
    groups.get(key)!.variants.push(variant);
  }
  return groups;
}

function getPlatformBadges(
  compatData: LCD.CompatStatement,
  showVersion: boolean,
  clayMode: ClayMode,
): React.ReactNode[] {
  const badges: React.ReactNode[] = [];

  // Non-Clay platforms: unchanged from the original behavior.
  for (const [p, support] of Object.entries(compatData.support ?? {})) {
    if (isClayVariant(p)) continue;
    const statement = getSupportStatement(support);
    if (!statement?.version_added) continue;
    const platform = p as LCD.PlatformName;
    badges.push(
      showVersion ? (
        <PlatformBadge
          key={platform}
          platform={platform}
          version={statement.version_added}
        />
      ) : (
        <PlatformBadge key={platform} platform={platform} />
      ),
    );
  }

  // Clay platforms: dispatch on mode.
  if (clayMode === 'expanded') {
    for (const variant of CLAY_VARIANTS) {
      const statement = getSupportStatement(compatData.support?.[variant]);
      if (!statement?.version_added) continue;
      badges.push(
        showVersion ? (
          <PlatformBadge
            key={variant}
            platform={variant}
            version={statement.version_added}
          />
        ) : (
          <PlatformBadge key={variant} platform={variant} />
        ),
      );
    }
  } else {
    const groups = groupClayByVersion(compatData);
    for (const [key, { variants, version }] of groups) {
      if (clayMode === 'collapsed') {
        // PlatformBadge maps platform='clay' to "Desktop" automatically.
        badges.push(
          showVersion ? (
            <PlatformBadge
              key={`clay-${key}`}
              platform={'clay' as LCD.PlatformName}
              version={version}
            />
          ) : (
            <PlatformBadge
              key={`clay-${key}`}
              platform={'clay' as LCD.PlatformName}
            />
          ),
        );
      } else {
        badges.push(
          <ClayGroupBadge
            key={`clay-${key}`}
            variants={variants}
            version={showVersion ? version : undefined}
          />,
        );
      }
    }
  }

  return badges;
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
  clayMode,
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

  const effectiveClayMode = clayMode ?? ENV_CLAY_MODE;
  const compatData = feature['__compat'] as LCD.CompatStatement;
  const badges: React.ReactNode[] = [
    ...(showStatus ? getStatusBadges(compatData) : []),
    ...(showPlatform
      ? getPlatformBadges(compatData, showVersion, effectiveClayMode)
      : []),
  ];

  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {badges}
    </span>
  );
}
