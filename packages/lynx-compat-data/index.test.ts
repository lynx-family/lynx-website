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
    expect(getSupportedPlatforms(sTO.__compat)).toEqual(['android', 'ios']);
  });
});
