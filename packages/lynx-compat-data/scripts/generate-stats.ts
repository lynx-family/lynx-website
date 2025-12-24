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
}

interface PlatformStats {
  supported_count: number;
  coverage_percent: number;
}

interface CategoryDetail {
  display_name: string;
  stats: CategoryStats;
  apis: string[];
  api_details: APIInfo[];
  missing: Partial<Record<PlatformName, APIInfo[]>>;
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
    total = 1;
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
  recentAPIs: RecentAPI[];
} {
  const fullPath = path.join(rootDir, categoryPath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Category path does not exist: ${fullPath}`);
    return {
      stats: { total: 0, supported: {}, coverage: {} },
      apis: [],
      apiDetails: [],
      missing: {},
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

  // Calculate missing APIs per platform
  const missing: Partial<Record<PlatformName, APIInfo[]>> = {};
  for (const platform of TRACKED_PLATFORMS) {
    missing[platform] = apiDetails.filter(
      (api) =>
        api.support[platform] === false || api.support[platform] === undefined,
    );
  }

  return {
    stats: { total, supported, coverage },
    apis: apiDetails.map((a) => a.path),
    apiDetails,
    missing,
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

  return recentVersions.map((v) => {
    const platformStats: Partial<
      Record<PlatformName, { supported: number; coverage: number }>
    > = {};

    for (const platform of TRACKED_PLATFORMS) {
      let supported = 0;
      for (const feature of allFeatures) {
        const support = feature.support[platform];
        if (support && isVersionAtOrBefore(support.version_added, v.version)) {
          supported++;
        }
      }
      const coverage =
        allFeatures.length > 0
          ? Math.round((supported / allFeatures.length) * 100)
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
    const { stats, apis, apiDetails, missing, recentAPIs } = processCategory(
      categoryPath,
      displayName,
      docPrefix,
    );

    categories[categoryPath] = {
      display_name: displayName,
      stats,
      apis,
      api_details: apiDetails,
      missing,
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
    byPlatform[platform] = {
      supported_count: globalSupported[platform] || 0,
      coverage_percent:
        globalTotal > 0
          ? Math.round(((globalSupported[platform] || 0) / globalTotal) * 100)
          : 0,
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
      `    ${platform}: ${ps?.supported_count} (${ps?.coverage_percent}%)`,
    );
  }
  console.log(`\n  Clay Platforms:`);
  for (const platform of [
    'clay_android',
    'clay_ios',
    'clay_macos',
    'clay_windows',
  ] as PlatformName[]) {
    const ps = byPlatform[platform];
    console.log(
      `    ${platform}: ${ps?.supported_count} (${ps?.coverage_percent}%)`,
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
