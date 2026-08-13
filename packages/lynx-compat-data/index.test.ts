import { describe, expect, expectTypeOf, it } from 'vitest';
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
