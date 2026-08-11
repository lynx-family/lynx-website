import { describe, expect, expectTypeOf, it } from 'vitest';
import listData from './elements/list.json';
import scrollViewData from './elements/scroll-view.json';
import setTimeoutData from './lynx-api/global/setTimeout.json';
import iosData from './platforms/ios.json';
import {
  CompatStatement,
  PlatformType,
  ReleaseStatement,
  type Identifier,
  type PlatformStatement,
} from './types/types.js';

import {
  getSupportedPlatforms,
  isCompatStatement,
  isPlatformStatement,
  isPlatformStatus,
  isPlatformType,
  isReleaseStatement,
  isSimpleSupportStatement,
  isStatusBlock,
  isSupportBlock,
  isSupportStatement,
} from './index.js';

const ios = iosData.platforms.ios;
const sTO = setTimeoutData['lynx-api'].global.setTimeout;
const clayPlatforms = [
  'clay_android',
  'clay_ios',
  'clay_macos',
  'clay_windows',
];
const clayScrollbarAttributes = [
  'scroll-bar-auto-hide',
  'scroll-bar-auto-hide-delay',
  'scroll-bar-width',
  'scroll-bar-thumb-width',
  'scroll-bar-thumb-min-length',
  'scroll-bar-thumb-radius',
  'scroll-bar-thumb-color',
  'scroll-bar-thumb-active-color',
  'scroll-bar-thumb-hover-color',
  'scroll-bar-track-color',
] as const;

describe('Platform', () => {
  it('should have correct type', () => {
    expectTypeOf(ios).toMatchTypeOf<PlatformStatement>();
    expectTypeOf(ios.type).toMatchTypeOf<PlatformType>();
    expectTypeOf(ios.releases['2.4']).toMatchTypeOf<ReleaseStatement>();
  });

  it('should validate platform statement', () => {
    expect(isPlatformStatement(ios)).toBe(true);
    expect(isPlatformStatement({})).toBe(false);

    expect(isPlatformType(ios.type)).toBe(true);
  });

  it('should validate release statement', () => {
    const rel = ios.releases['2.13'];

    expect(isReleaseStatement(rel)).toBe(true);
    expect(isPlatformStatus(rel.status)).toBe(true);
  });
});

describe('API', () => {
  it('should have correct type', () => {
    expectTypeOf(sTO).toMatchTypeOf<Identifier>();
    expectTypeOf(sTO.__compat).toMatchTypeOf<CompatStatement>();
  });

  it('should pass type predicates', () => {
    expect(isCompatStatement(sTO.__compat)).toBe(true);
    expect(isStatusBlock(sTO.__compat.status)).toBe(true);
    expect(isSupportBlock(sTO.__compat.support)).toBe(true);
    expect(isSupportStatement(sTO.__compat.support.android)).toBe(true);
    expect(isSimpleSupportStatement(sTO.__compat.support.android)).toBe(true);
  });
});

describe('scrollbar element compatibility', () => {
  const scrollViewAttributes =
    scrollViewData.elements['scroll-view'].attributes;
  const listAttributes = listData.elements.list.attributes;

  it.each(clayScrollbarAttributes)(
    'limits %s to Clay for scroll-view and list',
    (attribute) => {
      expect(
        Object.keys(scrollViewAttributes[attribute].__compat.support).sort(),
      ).toEqual(clayPlatforms);
      expect(
        Object.keys(listAttributes[attribute].__compat.support).sort(),
      ).toEqual(clayPlatforms);
    },
  );

  it('records the preferred names and platform-specific aliases', () => {
    expect(
      Object.keys(
        scrollViewAttributes['enable-scrollbar'].__compat.support,
      ).sort(),
    ).toEqual([...clayPlatforms, 'web_lynx'].sort());
    expect(
      scrollViewAttributes['scroll-bar-enable'].__compat.support.clay_macos,
    ).toMatchObject({
      alternative_name: 'enable-scrollbar',
      notes: expect.stringContaining('Deprecated alias'),
    });
    expect(
      Object.keys(listAttributes['scrollbar-enable'].__compat.support),
    ).toEqual(['web_lynx']);
  });
});

describe('Util functions', () => {
  it('should work', () => {
    expect(getSupportedPlatforms(sTO.__compat)).toEqual([
      'android',
      'ios',
      'harmony',
      'clay_macos',
      'clay_windows',
      'web_lynx',
    ]);
  });
});

describe('isStatusBlock', () => {
  it('accepts partial status with only experimental or only deprecated', () => {
    expect(isStatusBlock({ experimental: true })).toBe(true);
    expect(isStatusBlock({ deprecated: false })).toBe(true);
    expect(isStatusBlock({ experimental: true, deprecated: false })).toBe(true);
  });

  it('rejects an object with no known status key', () => {
    expect(isStatusBlock({})).toBe(false);
    expect(isStatusBlock({ foo: 1 })).toBe(false);
    expect(isStatusBlock({ standard_track: false })).toBe(false);
  });

  it('rejects objects that mix unknown keys in with known ones', () => {
    expect(isStatusBlock({ experimental: true, foo: 1 })).toBe(false);
  });

  it('rejects non-boolean values for known keys', () => {
    expect(isStatusBlock({ experimental: 'yes' })).toBe(false);
    expect(isStatusBlock({ deprecated: 1 })).toBe(false);
  });
});
