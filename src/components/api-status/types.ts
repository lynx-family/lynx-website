import type { PlatformName, VersionValue } from '@lynx-js/lynx-compat-data';

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
  'lynx-api': 'Lynx API',
  'lynx-native-api': 'Lynx Native API',
  react: 'ReactLynx',
  devtool: 'DevTools',
  errors: 'Errors',
};

export interface CategoryStats {
  total: number;
  supported: Partial<Record<PlatformName, number>>;
  coverage: Partial<Record<PlatformName, number>>;
}

export interface PlatformSummary {
  supported_count: number;
  coverage_percent: number;
}

export interface APIInfo {
  name: string;
  path: string;
  doc_url?: string;
}

export interface CategoryDetail {
  stats: CategoryStats;
  display_name: string;
  missing: Partial<Record<PlatformName, APIInfo[]>>;
}

export interface RecentAPI {
  name: string;
  path: string;
  category: string;
  doc_url?: string;
  versions: Partial<Record<PlatformName, VersionValue>>;
}

export interface FeatureInfo {
  id: string;
  query: string;
  name: string;
  description?: string;
  category: string;
  source_file?: string;
  support: Partial<Record<PlatformName, { version_added: VersionValue }>>;
}

export interface TimelinePoint {
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

export interface APIStats {
  generated_at: string;
  summary: {
    total_apis: number;
    by_category: Record<string, CategoryStats>;
    by_platform: Partial<Record<PlatformName, PlatformSummary>>;
  };
  categories: Record<string, CategoryDetail>;
  recent_apis: RecentAPI[];
  features?: FeatureInfo[];
  timeline?: TimelinePoint[];
}
