#!/usr/bin/env node
/**
 * Generate API statistics from lynx-compat-data
 *
 * This script walks through all compatibility data directories and generates
 * aggregated statistics for the API Status Dashboard.
 *
 * Usage: pnpm run gen-stats
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  CompatStatement,
  Identifier,
  PlatformName,
  SimpleSupportStatement,
  VersionValue,
} from '../types/types.js';

// All platforms to track
const TRACKED_PLATFORMS: PlatformName[] = [
  'android',
  'ios',
  'harmony',
  'web_lynx',
  'clay_android',
  'clay_ios',
  'clay_macos',
  'clay_windows',
];

// Clay sub-platforms for aggregate computation
const CLAY_SUB_PLATFORMS: PlatformName[] = [
  'clay_android',
  'clay_ios',
  'clay_macos',
  'clay_windows',
];

// Categories to scan with doc URL mappings
const CATEGORIES = [
  {
    path: 'elements',
    displayName: 'Elements',
    docPrefix: '/api/elements/built-in',
  },
  {
    path: 'css/properties',
    displayName: 'CSS Properties',
    docPrefix: '/api/css/properties',
  },
  {
    path: 'css/at-rule',
    displayName: 'CSS At-Rules',
    docPrefix: '/api/css/at-rule',
  },
  {
    path: 'css/data-type',
    displayName: 'CSS Data Types',
    docPrefix: '/api/css/data-type',
  },
  { path: 'lynx-api', displayName: 'Lynx API', docPrefix: '/api/lynx-api' },
  {
    path: 'lynx-native-api',
    displayName: 'Lynx Native API',
    docPrefix: '/api/lynx-native-api',
  },
  { path: 'react', displayName: 'ReactLynx', docPrefix: '/api/react' },
  { path: 'devtool', displayName: 'DevTool', docPrefix: '/guide/devtool' },
  { path: 'errors', displayName: 'Errors', docPrefix: '/api/errors' },
];

// Recent versions to track for "recently added" APIs
const RECENT_VERSIONS = ['3.4', '3.5'];

interface APIInfo {
  path: string;
  name: string;
  doc_url?: string;
  support: Partial<Record<PlatformName, string | boolean>>;
}

interface CategoryStats {
  total: number;
  supported: Partial<Record<PlatformName, number>>;
  coverage: Partial<Record<PlatformName, number>>;
  exclusive: Partial<Record<PlatformName, number>>;
}

interface PlatformStats {
  supported_count: number;
  coverage_percent: number;
  exclusive_count: number;
}

interface CategoryDetail {
  display_name: string;
  stats: CategoryStats;
  apis: string[];
  api_details: APIInfo[];
  missing: Partial<Record<PlatformName, APIInfo[]>>;
  exclusive: Partial<Record<PlatformName, APIInfo[]>>;
}

interface RecentAPI {
  path: string;
  name: string;
  category: string;
  doc_url?: string;
  versions: Partial<Record<PlatformName, string | boolean>>;
}

interface FeatureInfo {
  id: string;
  query: string;
  name: string;
  description?: string;
  category: string;
  source_file?: string;
  support: Partial<
    Record<PlatformName, { version_added: string | boolean | null }>
  >;
}

interface TimelinePoint {
  version: string;
  release_date?: string;
  platforms: Partial<
    Record<
      PlatformName,
      {
        supported: number;
        coverage: number;
      }
    >
  >;
}

interface APIStats {
  generated_at: string;
  summary: {
    total_apis: number;
    by_category: Record<string, CategoryStats>;
    by_platform: Partial<Record<PlatformName, PlatformStats>>;
  };
  categories: Record<string, CategoryDetail>;
  recent_apis: RecentAPI[];
  features: FeatureInfo[];
  timeline: TimelinePoint[];
}

const dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(dirname, '..');

/**
 * Check if a version value indicates support
 */
function isSupported(version: VersionValue): boolean {
  return version !== false && version !== null;
}

/**
 * Get version_added from a support statement
 */
function getVersionAdded(
  support: SimpleSupportStatement | SimpleSupportStatement[] | undefined,
): VersionValue {
  if (!support) return false;
  if (Array.isArray(support)) {
    for (const s of support) {
      if (isSupported(s.version_added)) {
        return s.version_added;
      }
    }
    return false;
  }
  return support.version_added;
}

/**
 * Check if a version is in the recent versions list
 */
function isRecentVersion(version: VersionValue): boolean {
  if (typeof version !== 'string') return false;
  return RECENT_VERSIONS.some((rv) => version.startsWith(rv));
}

/**
 * Get the earliest version from a list of supported version values.
 * Used for computing aggregate Clay support.
 */
function getEarliestVersion(versions: (string | boolean)[]): string | boolean {
  const strings = versions.filter((v): v is string => typeof v === 'string');
  if (strings.length === 0) return true; // all are boolean `true`
  strings.sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    return pa[0] * 1000 + (pa[1] || 0) - (pb[0] * 1000 + (pb[1] || 0));
  });
  return strings[0];
}

/**
 * Generate documentation URL from API path
 */
function generateDocUrl(apiPath: string, docPrefix: string): string {
  // Convert path like 'elements/view' to '/api/elements/built-in/view'
  // or 'css/properties/gap' to '/api/css/properties/gap'
  const parts = apiPath.split('/');
  const fileName = parts[parts.length - 1].split('.')[0]; // Remove nested accessor

  // Handle special cases
  if (docPrefix.includes('elements')) {
    return `${docPrefix}/${fileName}`;
  }
  if (docPrefix.includes('css/properties')) {
    return `${docPrefix}/${fileName}`;
  }
  if (docPrefix.includes('lynx-api')) {
    // lynx-api/global/setTimeout -> /api/lynx-api/global/setTimeout
    const subPath = apiPath.replace('lynx-api/', '');
    return `/api/lynx-api/${subPath.split('.')[0]}`;
  }
  if (docPrefix.includes('lynx-native-api')) {
    const subPath = apiPath.replace('lynx-native-api/', '');
    return `/api/lynx-native-api/${subPath.split('.')[0]}`;
  }

  return `${docPrefix}/${fileName}`;
}

/**
 * Recursively collect APIs and their support from an Identifier
 */
function collectAPIs(
  identifier: Identifier,
  apiPath: string,
  category: string,
  docPrefix: string,
  apiDetails: APIInfo[],
  recentAPIs: RecentAPI[],
): {
  total: number;
  supported: Partial<Record<PlatformName, number>>;
} {
  let total = 0;
  const supported: Partial<Record<PlatformName, number>> = {};

  for (const platform of TRACKED_PLATFORMS) {
    supported[platform] = 0;
  }

  if (identifier.__compat) {
    const compat = identifier.__compat as CompatStatement;
    const support: Partial<Record<PlatformName, string | boolean>> = {};
    let isRecent = false;

    for (const platform of TRACKED_PLATFORMS) {
      const platformSupport = compat.support[platform];
      const versionAdded = getVersionAdded(
        platformSupport as SimpleSupportStatement | SimpleSupportStatement[],
      );

      if (isSupported(versionAdded)) {
        supported[platform] = 1;
        support[platform] =
          typeof versionAdded === 'string' ? versionAdded : true;
        if (isRecentVersion(versionAdded)) {
          isRecent = true;
        }
      } else {
        support[platform] = false;
      }
    }

    // Only count toward total if at least 2 platforms support this API.
    // APIs supported by 0 platforms are documented to signal Web API gaps.
    // APIs supported by exactly 1 platform are platform-exclusive features
    // (e.g. iOS-specific attributes, web_lynx-inheriting Web APIs).
    // Neither should penalize other platforms in their coverage scores.
    const supportCount = TRACKED_PLATFORMS.filter(
      (p) => (supported[p] || 0) > 0,
    ).length;
    total = supportCount >= 2 ? 1 : 0;

    const docUrl = compat.lynx_path || generateDocUrl(apiPath, docPrefix);
    const name =
      compat.description ||
      apiPath.split('/').pop()?.split('.').pop() ||
      apiPath;

    const apiInfo: APIInfo = {
      path: apiPath,
      name,
      doc_url: docUrl,
      support,
    };
    apiDetails.push(apiInfo);

    if (isRecent) {
      recentAPIs.push({
        path: apiPath,
        name,
        category,
        doc_url: docUrl,
        versions: support,
      });
    }
  }

  // Recursively process nested identifiers
  for (const [key, value] of Object.entries(identifier)) {
    if (key === '__compat') continue;
    if (typeof value === 'object' && value !== null) {
      // Check if the key is already part of the path (to avoid duplication)
      // The path could be "elements/common" and key could be "common"
      // In this case, we should NOT append the key
      const pathParts = apiPath.replace(/\//g, '.').split('.');
      const isKeyInPath = pathParts.includes(key);

      // Only append the key if it's not already represented in the path
      const newPath = isKeyInPath ? apiPath : `${apiPath}.${key}`;

      const nestedResult = collectAPIs(
        value as Identifier,
        newPath,
        category,
        docPrefix,
        apiDetails,
        recentAPIs,
      );
      total += nestedResult.total;
      for (const platform of TRACKED_PLATFORMS) {
        supported[platform] =
          (supported[platform] || 0) + (nestedResult.supported[platform] || 0);
      }
    }
  }

  return { total, supported };
}

/**
 * Process a single JSON file
 */
function processFile(
  filePath: string,
  category: string,
  docPrefix: string,
  apiDetails: APIInfo[],
  recentAPIs: RecentAPI[],
): {
  total: number;
  supported: Partial<Record<PlatformName, number>>;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  let total = 0;
  const supported: Partial<Record<PlatformName, number>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    supported[platform] = 0;
  }

  // Get the relative file path (e.g., "lynx-api/lynx/createSelectorQuery")
  const relativePath = path.relative(rootDir, filePath).replace(/\.json$/, '');

  for (const [, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      // Use the file path as the starting path
      // The JSON structure mirrors the file path, so the file path IS the query
      const result = collectAPIs(
        value as Identifier,
        relativePath, // Use file path like "lynx-api/lynx/createSelectorQuery"
        category,
        docPrefix,
        apiDetails,
        recentAPIs,
      );
      total += result.total;
      for (const platform of TRACKED_PLATFORMS) {
        supported[platform] =
          (supported[platform] || 0) + (result.supported[platform] || 0);
      }
    }
  }

  return { total, supported };
}

/**
 * Process a category directory
 */
function processCategory(
  categoryPath: string,
  displayName: string,
  docPrefix: string,
): {
  stats: CategoryStats;
  apis: string[];
  apiDetails: APIInfo[];
  missing: Partial<Record<PlatformName, APIInfo[]>>;
  exclusiveApis: Partial<Record<PlatformName, APIInfo[]>>;
  recentAPIs: RecentAPI[];
} {
  const fullPath = path.join(rootDir, categoryPath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Category path does not exist: ${fullPath}`);
    return {
      stats: { total: 0, supported: {}, coverage: {}, exclusive: {} },
      apis: [],
      apiDetails: [],
      missing: {},
      exclusiveApis: {},
      recentAPIs: [],
    };
  }

  let total = 0;
  const supported: Partial<Record<PlatformName, number>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    supported[platform] = 0;
  }
  const apiDetails: APIInfo[] = [];
  const recentAPIs: RecentAPI[] = [];

  const processDir = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        processDir(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const result = processFile(
          entryPath,
          categoryPath,
          docPrefix,
          apiDetails,
          recentAPIs,
        );
        total += result.total;
        for (const platform of TRACKED_PLATFORMS) {
          supported[platform] =
            (supported[platform] || 0) + (result.supported[platform] || 0);
        }
      }
    }
  };

  processDir(fullPath);

  // Calculate coverage percentages
  const coverage: Partial<Record<PlatformName, number>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    coverage[platform] =
      total > 0 ? Math.round(((supported[platform] || 0) / total) * 100) : 0;
  }

  // Calculate missing APIs per platform (only for shared APIs, i.e. supported by >=2 platforms)
  const missing: Partial<Record<PlatformName, APIInfo[]>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    missing[platform] = apiDetails.filter((api) => {
      const supportCount = TRACKED_PLATFORMS.filter(
        (p) => api.support[p] !== false && api.support[p] !== undefined,
      ).length;
      if (supportCount < 2) return false;
      return (
        api.support[platform] === false || api.support[platform] === undefined
      );
    });
  }

  // Calculate per-platform exclusive APIs in this category
  const exclusive: Partial<Record<PlatformName, number>> = {};
  const exclusiveApis: Partial<Record<PlatformName, APIInfo[]>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    const apis = apiDetails.filter((api) => {
      const supporters = TRACKED_PLATFORMS.filter(
        (p) => api.support[p] !== false && api.support[p] !== undefined,
      );
      return (
        supporters.length === 1 &&
        api.support[platform] !== false &&
        api.support[platform] !== undefined
      );
    });
    exclusive[platform] = apis.length;
    exclusiveApis[platform] = apis;
  }

  return {
    stats: { total, supported, coverage, exclusive },
    apis: apiDetails.map((a) => a.path),
    apiDetails,
    missing,
    exclusiveApis,
    recentAPIs,
  };
}

/**
 * Load version history for timeline
 */
function loadVersionHistory(): Array<{
  version: string;
  release_date?: string;
}> {
  const versionPath = path.join(rootDir, 'version.json');
  if (!fs.existsSync(versionPath)) {
    return [];
  }
  const content = fs.readFileSync(versionPath, 'utf-8');
  const data = JSON.parse(content);
  return data.history || [];
}

/**
 * Check if a version_added is at or before a given version
 */
function isVersionAtOrBefore(
  versionAdded: string | boolean | null | undefined,
  targetVersion: string,
): boolean {
  if (versionAdded === true) return true; // Always supported
  if (
    versionAdded === false ||
    versionAdded === null ||
    versionAdded === undefined
  )
    return false;

  // Parse version strings like "3.4" or "2.17"
  const parseVersion = (v: string) => {
    const parts = v.split('.').map(Number);
    return parts[0] * 1000 + (parts[1] || 0);
  };

  return parseVersion(versionAdded) <= parseVersion(targetVersion);
}

/**
 * Calculate timeline data for parity over versions
 */
function calculateTimeline(
  allFeatures: FeatureInfo[],
  versionHistory: Array<{ version: string; release_date?: string }>,
): TimelinePoint[] {
  // Only use recent versions (last 10)
  const recentVersions = versionHistory.slice(-10);

  // Only count shared features (supported by at least 2 platforms)
  const relevantFeatures = allFeatures.filter((f) => {
    const supportCount = TRACKED_PLATFORMS.filter((p) => {
      const support = f.support[p];
      return support && isSupported(support.version_added);
    }).length;
    return supportCount >= 2;
  });

  return recentVersions.map((v) => {
    const platformStats: Partial<
      Record<PlatformName, { supported: number; coverage: number }>
    > = {};

    for (const platform of TRACKED_PLATFORMS) {
      let supported = 0;
      for (const feature of relevantFeatures) {
        const support = feature.support[platform];
        if (support && isVersionAtOrBefore(support.version_added, v.version)) {
          supported++;
        }
      }
      const coverage =
        relevantFeatures.length > 0
          ? Math.round((supported / relevantFeatures.length) * 100)
          : 0;
      platformStats[platform] = { supported, coverage };
    }

    return {
      version: v.version,
      release_date: v.release_date,
      platforms: platformStats,
    };
  });
}

/**
 * Post-process stats to add aggregate "clay" platform data.
 * For each API, "clay" is supported if ANY of the 4 Clay sub-platforms supports it.
 * The version shown is the earliest among supporting sub-platforms.
 */
function addClayAggregate(stats: APIStats): void {
  const clay = 'clay' as PlatformName;
  const nonClayPlatforms = TRACKED_PLATFORMS.filter(
    (p) => !CLAY_SUB_PLATFORMS.includes(p),
  );

  // 1. Process each category: compute aggregate clay stats per API
  for (const cat of Object.values(stats.categories)) {
    let claySupported = 0;

    for (const api of cat.api_details) {
      const supportingVersions = CLAY_SUB_PLATFORMS.map(
        (p) => api.support[p],
      ).filter((v): v is string | boolean => v !== false && v !== undefined);

      if (supportingVersions.length > 0) {
        claySupported++;
        api.support[clay] = getEarliestVersion(supportingVersions);
      } else {
        api.support[clay] = false;
      }
    }

    cat.stats.supported[clay] = claySupported;
    cat.stats.coverage[clay] =
      cat.stats.total > 0
        ? Math.round((claySupported / cat.stats.total) * 100)
        : 0;

    // Exclusive to clay in this category: supported by clay but no non-clay platform
    const clayExclApis = cat.api_details.filter((api) => {
      const anyClaySupports = CLAY_SUB_PLATFORMS.some(
        (p) => api.support[p] !== false && api.support[p] !== undefined,
      );
      if (!anyClaySupports) return false;
      return nonClayPlatforms.every(
        (p) => api.support[p] === false || api.support[p] === undefined,
      );
    });
    cat.stats.exclusive = cat.stats.exclusive || {};
    cat.stats.exclusive[clay] = clayExclApis.length;
    cat.exclusive = cat.exclusive || {};
    cat.exclusive[clay] = clayExclApis;

    // Missing from clay = unsupported by ALL Clay sub-platforms,
    // but is a shared API (supported by >=2 tracked platforms)
    cat.missing[clay] = cat.api_details.filter((api) => {
      const noClaySupport = CLAY_SUB_PLATFORMS.every(
        (p) => api.support[p] === false || api.support[p] === undefined,
      );
      if (!noClaySupport) return false;
      const supportCount = TRACKED_PLATFORMS.filter(
        (p) => api.support[p] !== false && api.support[p] !== undefined,
      ).length;
      return supportCount >= 2;
    });
  }

  // 2. Add to summary.by_platform
  const totalSupported = Object.values(stats.categories).reduce(
    (sum, cat) => sum + (cat.stats.supported[clay] || 0),
    0,
  );

  // Count exclusive APIs for clay aggregate: supported by clay but no non-clay platform
  const clayExclusiveCount = stats.features
    ? stats.features.filter((f) => {
        // Must be supported by at least one clay sub-platform
        const anyClaySupports = CLAY_SUB_PLATFORMS.some((p) => {
          const s = f.support[p];
          return s && isSupported(s.version_added);
        });
        if (!anyClaySupports) return false;
        // Must NOT be supported by any non-clay platform
        return nonClayPlatforms.every((p) => {
          const s = f.support[p];
          return !s || !isSupported(s.version_added);
        });
      }).length
    : 0;

  stats.summary.by_platform[clay] = {
    supported_count: totalSupported,
    coverage_percent:
      stats.summary.total_apis > 0
        ? Math.round((totalSupported / stats.summary.total_apis) * 100)
        : 0,
    exclusive_count: clayExclusiveCount,
  };

  // 3. Add to features
  if (stats.features) {
    for (const feature of stats.features) {
      const clayVersions = CLAY_SUB_PLATFORMS.map(
        (p) => feature.support[p]?.version_added,
      ).filter(
        (v): v is string | boolean =>
          v !== false && v !== null && v !== undefined,
      );
      feature.support[clay] = {
        version_added:
          clayVersions.length > 0 ? getEarliestVersion(clayVersions) : false,
      };
    }
  }

  // 4. Add to recent_apis
  for (const api of stats.recent_apis) {
    const clayVersions = CLAY_SUB_PLATFORMS.map((p) => api.versions[p]).filter(
      (v): v is string | boolean =>
        v !== false && v !== null && v !== undefined,
    );
    api.versions[clay] =
      clayVersions.length > 0 ? getEarliestVersion(clayVersions) : false;
  }

  // 5. Add to timeline (must recompute properly per version)
  if (stats.timeline && stats.features) {
    const relevantFeatures = stats.features.filter((f) => {
      const supportCount = TRACKED_PLATFORMS.filter((p) => {
        const support = f.support[p];
        return support && isSupported(support.version_added);
      }).length;
      return supportCount >= 2;
    });

    for (const point of stats.timeline) {
      let supported = 0;
      for (const feature of relevantFeatures) {
        const anyClayAtVersion = CLAY_SUB_PLATFORMS.some((p) => {
          const support = feature.support[p];
          return (
            support && isVersionAtOrBefore(support.version_added, point.version)
          );
        });
        if (anyClayAtVersion) supported++;
      }
      const coverage =
        relevantFeatures.length > 0
          ? Math.round((supported / relevantFeatures.length) * 100)
          : 0;
      point.platforms[clay] = { supported, coverage };
    }
  }
}

/**
 * Main function to generate stats
 */
function generateStats(): APIStats {
  console.log('Generating API statistics...');

  const categories: Record<string, CategoryDetail> = {};
  const byCategory: Record<string, CategoryStats> = {};
  const allRecentAPIs: RecentAPI[] = [];
  const allFeatures: FeatureInfo[] = [];

  let globalTotal = 0;
  const globalSupported: Partial<Record<PlatformName, number>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    globalSupported[platform] = 0;
  }

  let featureId = 0;
  for (const { path: categoryPath, displayName, docPrefix } of CATEGORIES) {
    console.log(`  Processing ${displayName}...`);
    const { stats, apis, apiDetails, missing, exclusiveApis, recentAPIs } =
      processCategory(categoryPath, displayName, docPrefix);

    categories[categoryPath] = {
      display_name: displayName,
      stats,
      apis,
      api_details: apiDetails,
      missing,
      exclusive: exclusiveApis,
    };

    byCategory[categoryPath] = stats;

    globalTotal += stats.total;
    for (const platform of TRACKED_PLATFORMS) {
      globalSupported[platform] =
        (globalSupported[platform] || 0) + (stats.supported[platform] || 0);
    }

    allRecentAPIs.push(...recentAPIs);

    // Build features list
    for (const api of apiDetails) {
      const support: Partial<
        Record<PlatformName, { version_added: string | boolean | null }>
      > = {};
      for (const platform of TRACKED_PLATFORMS) {
        const va = api.support[platform];
        support[platform] = { version_added: va === undefined ? null : va };
      }

      // APITable expects queries like "elements/view" or "elements/view.name"
      // The api.path format is: "file/path.accessor1.accessor2..."
      // The JSON structure mirrors the file path, so we need to:
      // 1. Extract the file path portion (before any dots)
      // 2. Compare accessor parts with file path segments to remove duplicates
      // 3. Keep only truly nested accessors that aren't part of the file namespace

      const dotIndex = api.path.indexOf('.');
      let query: string;

      if (dotIndex === -1) {
        // No dot - simple file path like "elements/view"
        query = api.path;
      } else {
        // Has dots - file path with accessor like "elements/view.elements.view.name"
        const filePath = api.path.substring(0, dotIndex);
        const accessorPart = api.path.substring(dotIndex + 1);

        // Get the file path as a dot-separated string for comparison
        const filePathAsDots = filePath.replace(/\//g, '.');

        // Check if the accessor starts with the file path namespace (it usually does due to JSON structure)
        // If so, remove that prefix
        let cleanAccessor = accessorPart;
        if (accessorPart.startsWith(filePathAsDots)) {
          // Remove the file path prefix from accessor
          cleanAccessor = accessorPart.substring(filePathAsDots.length);
          // Remove leading dot if present
          if (cleanAccessor.startsWith('.')) {
            cleanAccessor = cleanAccessor.substring(1);
          }
        } else {
          // Check for partial matches (e.g., just the last segment)
          const filePathParts = filePath.split('/');
          const accessorParts = accessorPart.split('.');

          // Remove leading parts from accessor that match trailing parts of file path
          let matchCount = 0;
          for (
            let i = 0;
            i < Math.min(filePathParts.length, accessorParts.length);
            i++
          ) {
            if (
              filePathParts[filePathParts.length - 1 - i] ===
              accessorParts[accessorParts.length - 1 - matchCount]
            ) {
              // This doesn't quite work for our case, let's try simpler approach
            }
          }

          // Simpler: just remove consecutive duplicates
          const dedupedParts: string[] = [];
          for (const part of accessorParts) {
            if (
              dedupedParts.length === 0 ||
              part !== dedupedParts[dedupedParts.length - 1]
            ) {
              dedupedParts.push(part);
            }
          }
          cleanAccessor = dedupedParts.join('.');
        }

        query = cleanAccessor ? `${filePath}.${cleanAccessor}` : filePath;
      }

      // Extract the source file path (everything before the first dot accessor)
      const sourceFile = api.path.split('.')[0] + '.json';

      allFeatures.push({
        id: `feature-${featureId++}`,
        query,
        name: api.name,
        description: undefined, // Could be added if available
        category: categoryPath,
        source_file: sourceFile,
        support,
      });
    }
  }

  // Calculate global platform stats for ALL platforms
  const byPlatform: Partial<Record<PlatformName, PlatformStats>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    // Count exclusive APIs: supported ONLY by this platform (among all tracked)
    const exclusiveCount = allFeatures.filter((f) => {
      const supporters = TRACKED_PLATFORMS.filter((p) => {
        const s = f.support[p];
        return s && isSupported(s.version_added);
      });
      if (supporters.length !== 1) return false;
      const s = f.support[platform];
      return s && isSupported(s.version_added);
    }).length;

    byPlatform[platform] = {
      supported_count: globalSupported[platform] || 0,
      coverage_percent:
        globalTotal > 0
          ? Math.round(((globalSupported[platform] || 0) / globalTotal) * 100)
          : 0,
      exclusive_count: exclusiveCount,
    };
  }

  // Sort recent APIs by name
  allRecentAPIs.sort((a, b) => a.name.localeCompare(b.name));

  // Load version history and calculate timeline
  const versionHistory = loadVersionHistory();
  const timeline = calculateTimeline(allFeatures, versionHistory);

  const stats: APIStats = {
    generated_at: new Date().toISOString(),
    summary: {
      total_apis: globalTotal,
      by_category: byCategory,
      by_platform: byPlatform,
    },
    categories,
    recent_apis: allRecentAPIs.slice(0, 100),
    features: allFeatures,
    timeline,
  };

  // Add aggregate Clay platform data
  addClayAggregate(stats);

  console.log(`\nSummary:`);
  console.log(`  Total APIs: ${globalTotal}`);
  console.log(`  Features: ${allFeatures.length}`);
  console.log(`  Timeline points: ${timeline.length}`);
  console.log(`\n  Native Platforms:`);
  for (const platform of [
    'android',
    'ios',
    'harmony',
    'web_lynx',
  ] as PlatformName[]) {
    const ps = byPlatform[platform];
    console.log(
      `    ${platform}: ${ps?.supported_count}/${globalTotal} (${ps?.coverage_percent}%) +${ps?.exclusive_count} exclusive`,
    );
  }
  const clayAgg = byPlatform['clay' as PlatformName];
  console.log(`\n  Clay (Aggregate):`);
  console.log(
    `    clay: ${clayAgg?.supported_count}/${globalTotal} (${clayAgg?.coverage_percent}%) +${clayAgg?.exclusive_count} exclusive`,
  );
  console.log(`\n  Clay Platforms:`);
  for (const platform of [
    'clay_android',
    'clay_ios',
    'clay_macos',
    'clay_windows',
  ] as PlatformName[]) {
    const ps = byPlatform[platform];
    console.log(
      `    ${platform}: ${ps?.supported_count}/${globalTotal} (${ps?.coverage_percent}%) +${ps?.exclusive_count} exclusive`,
    );
  }

  return stats;
}

// Run the script
const stats = generateStats();

// Write output
const outputPath = path.join(rootDir, 'api-stats.json');
fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
console.log(`\nStats written to ${outputPath}`);
