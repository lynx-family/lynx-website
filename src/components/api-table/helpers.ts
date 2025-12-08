import type BCD from '@lynx-js/lynx-compat-data';

export type FeatureItem = {
  name: string;
  label: string;
  fromDescription: boolean;
  compat: BCD.CompatStatement;
  depth: number;
};

export function listFeatures(obj: BCD.Identifier, depth = 1): FeatureItem[] {
  const items: FeatureItem[] = [];
  for (const key of Object.keys(obj)) {
    if (key === '__compat') continue;
    const child: any = (obj as any)[key];
    if (child && typeof child === 'object') {
      if (child.__compat) {
        const desc = child.__compat.description as string | undefined;
        const label = desc || key;
        items.push({
          name: key,
          label,
          fromDescription: !!desc,
          compat: child.__compat,
          depth,
        });
      }
      items.push(...listFeatures(child as BCD.Identifier, depth + 1));
    }
  }
  return items;
}

export type SupportLevel = 'yes' | 'no' | 'partial' | 'unknown';

export function getSupportLevel(
  compat: BCD.CompatStatement,
  browser: BCD.PlatformName,
): SupportLevel {
  const s = compat.support[browser];
  if (!s) return 'unknown';
  const arr = Array.isArray(s) ? s : [s];
  let hasYes = false;
  let hasPartial = false;
  let hasUnknown = false;
  for (const it of arr) {
    if (it.partial_implementation) hasPartial = true;
    if (it.version_added === null) {
      hasUnknown = true;
      continue;
    }
    if (it.version_added && it.version_added !== false) {
      if (
        !it.version_removed ||
        it.version_removed === false ||
        it.version_removed === null
      ) {
        hasYes = true;
      }
    }
  }
  if (hasYes) return hasPartial ? 'partial' : 'yes';
  if (hasUnknown) return 'unknown';
  return hasPartial ? 'partial' : 'no';
}

export function gatherBrowsers(platforms: BCD.Platforms): {
  platformOrder: BCD.PlatformType[];
  browsers: BCD.PlatformName[];
} {
  if (process.env.COMPAT_TABLE_HIDE_CLAY) {
    const platformOrder: BCD.PlatformType[] = ['native', 'web'];
    const browsers: BCD.PlatformName[] = [] as any;
    for (const key of Object.keys(platforms) as BCD.PlatformName[]) {
      if (platforms[key].type === 'native' && !key.startsWith('clay_')) {
        browsers.push(key);
      }
    }
    if ('clay_macos' in platforms) browsers.push('clay_macos');
    if ('clay_windows' in platforms) browsers.push('clay_windows');
    for (const key of Object.keys(platforms) as BCD.PlatformName[]) {
      if (platforms[key].type === 'web') browsers.push(key);
    }
    return { platformOrder, browsers };
  }
  const platformOrder: BCD.PlatformType[] = ['native', 'clay', 'web'];
  const browsers: BCD.PlatformName[] = [] as any;
  for (const p of platformOrder) {
    for (const key of Object.keys(platforms) as BCD.PlatformName[]) {
      if (platforms[key].type === p) browsers.push(key);
    }
  }
  return { platformOrder, browsers };
}

export function getNestedValue(obj: any, query: string): any {
  return query.split('/').reduce((acc, key) => {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

function clampVersionLabel(version: string): string {
  const extract = (v: string) => {
    const m = v.match(/\d+(?:\.\d+){0,2}/);
    return m ? m[0] : null;
  };
  const parse = (v: string) => {
    const m = v.match(/^\d+(?:\.\d+){0,2}$/);
    if (!m) return null;
    const parts = v.split('.');
    const major = Number(parts[0]);
    const minor = Number(parts[1] ?? '0');
    if (Number.isNaN(major) || Number.isNaN(minor)) return null;
    return { major, minor };
  };
  const curStr = extract(String(version));
  if (!curStr) return version;
  const targetStr = process.env.OSS;
  if (!targetStr) return curStr;
  const cur = parse(curStr);
  const target = parse(String(targetStr));
  if (!cur || !target) return curStr;
  if (
    cur.major < target.major ||
    (cur.major === target.major && cur.minor < target.minor)
  ) {
    return targetStr;
  }
  return curStr;
}

export function getSupportInfo(
  compat: BCD.CompatStatement,
  platform: BCD.PlatformName,
): { level: SupportLevel; label: string } {
  const level = getSupportLevel(compat, platform);
  const s = compat.support[platform];
  if (!s) return { level, label: '?' };
  const first = Array.isArray(s) ? s[0] : s;
  const va = (first as any).version_added;
  if (va === null) return { level, label: '?' };
  if (va === false) return { level, label: 'No' };
  if (typeof va === 'string') return { level, label: clampVersionLabel(va) };
  if (va === true) return { level, label: 'Yes' };
  return { level, label: '?' };
}

export function mapPlatformNameToIconName(platformName: BCD.PlatformName) {
  switch (platformName) {
    case 'ios':
    case 'clay_macos':
    case 'clay_ios':
      return 'apple';
    case 'android':
    case 'clay_android':
      return 'android';
    case 'clay_windows':
      return 'windows';
    case 'web_lynx':
      return 'web';
    case 'harmony':
      return 'harmony';
    default:
      return platformName;
  }
}
