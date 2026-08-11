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
  'enable-scrollbar',
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
    'records %s as added in Clay 3.7 for scroll-view and list',
    (attribute) => {
      const scrollViewSupport =
        scrollViewAttributes[attribute].__compat.support;
      const listSupport = listAttributes[attribute].__compat.support;

      expect(Object.keys(scrollViewSupport).sort()).toEqual(clayPlatforms);
      expect(Object.keys(listSupport).sort()).toEqual(clayPlatforms);
      expect(
        Object.values(scrollViewSupport).map(
          ({ version_added }) => version_added,
        ),
      ).toEqual(['3.7', '3.7', '3.7', '3.7']);
      expect(
        Object.values(listSupport).map(({ version_added }) => version_added),
      ).toEqual(['3.7', '3.7', '3.7', '3.7']);
    },
  );
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
