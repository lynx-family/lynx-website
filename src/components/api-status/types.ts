import type { PlatformName, VersionValue } from '@lynx-js/lynx-compat-data';

/** PlatformName extended with the aggregate 'clay' virtual platform. */
export type DisplayPlatformName = PlatformName | 'clay';

export const NATIVE_PLATFORMS: PlatformName[] = [
  'android',
  'ios',
  'harmony',
  'web_lynx',
];
export const CLAY_PLATFORMS: PlatformName[] = [
  'clay_android',
  'clay_ios',
  'clay_macos',
  'clay_windows',
];

export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'css/properties': 'CSS Properties',
  'css/data-type': 'CSS Data Types',
  'css/at-rule': 'CSS At-Rules',
  elements: 'Elements',
  'lynx-api/global': 'Lynx Global API',
  'lynx-api/event': 'Lynx Event API',
  'lynx-api/fetch': 'Lynx Fetch API',
  'lynx-api/lynx': 'lynx.*',
  'lynx-api/selector-query': 'Lynx Selector Query',
  'lynx-api/nodes-ref': 'Lynx Nodes Ref',
  'lynx-api/intersection-observer': 'Lynx Intersection Observer',
  'lynx-api/main-thread': 'Lynx Main Thread API',
  'lynx-api/performance-api': 'Lynx Performance API',
  'lynx-native-api': 'Lynx Native API',
  react: 'ReactLynx',
  devtool: 'DevTools',
  errors: 'Errors',
};

export interface CategoryStats {
  total: number;
  supported: Partial<Record<DisplayPlatformName, number>>;
  /** Coverage percentage per platform. `null` means the category is N/A for that platform. */
  coverage: Partial<Record<DisplayPlatformName, number | null>>;
  exclusive: Partial<Record<DisplayPlatformName, number>>;
}

export interface PlatformSummary {
  supported_count: number;
  coverage_percent: number;
  exclusive_count: number;
}

export interface APIInfo {
  name: string;
  path: string;
  doc_url?: string;
}

export interface CategoryDetail {
  stats: CategoryStats;
  display_name: string;
  missing: Partial<Record<DisplayPlatformName, APIInfo[]>>;
  exclusive: Partial<Record<DisplayPlatformName, APIInfo[]>>;
}

export interface RecentAPI {
  name: string;
  path: string;
  category: string;
  doc_url?: string;
  versions: Partial<Record<DisplayPlatformName, VersionValue>>;
}

export interface FeatureInfo {
  id: string;
  query: string;
  name: string;
  description?: string;
  category: string;
  source_file?: string;
  support: Partial<
    Record<DisplayPlatformName, { version_added: VersionValue }>
  >;
}

export interface TimelinePoint {
  version: string;
  release_date?: string;
  platforms: Partial<
    Record<
      DisplayPlatformName,
      {
        supported: number;
        coverage: number;
      }
    >
  >;
}

export interface APIStats {
  generated_at: string;
  summary: {
    total_apis: number;
    /** Total APIs in Lynx Platform API categories only (used for coverage). */
    platform_api_total: number;
    by_category: Record<string, CategoryStats>;
    by_platform: Partial<Record<DisplayPlatformName, PlatformSummary>>;
  };
  /** Which group each category belongs to: 'platform' (Lynx Platform API) or 'other'. */
  category_groups: Record<string, 'platform' | 'other'>;
  categories: Record<string, CategoryDetail>;
  recent_apis: RecentAPI[];
  features?: FeatureInfo[];
  timeline?: TimelinePoint[];
}
