export interface SdkVersioning {
  latestStable: string;
  baseline?: string;
  /** Show release status in HTML and Markdown. Defaults to true. */
  showReleaseStatus?: boolean;
}

/** Each host owns its release state and optional capsule display baseline. */
export function validateSdkVersioning(value: SdkVersioning): SdkVersioning {
  const latestStable = parseSdkVersion(
    value.latestStable,
    'sdkVersioning.latestStable',
  );
  if (
    value.showReleaseStatus !== undefined &&
    typeof value.showReleaseStatus !== 'boolean'
  ) {
    throw new Error('sdkVersioning.showReleaseStatus must be a boolean');
  }
  if (value.baseline !== undefined) {
    const baseline = parseSdkVersion(value.baseline, 'sdkVersioning.baseline');
    if (compareParsedSdkVersions(baseline, latestStable) > 0) {
      throw new Error('sdkVersioning.baseline must not exceed latestStable');
    }
  }
  return value;
}

/** Page-level SDK facts currently apply only to handwritten guide routes. */
export function isSdkSinceGuide(relativePath: unknown): boolean {
  return (
    typeof relativePath === 'string' &&
    /^(en|zh)\/guide\/.+\.mdx?$/.test(relativePath.replace(/\\/g, '/'))
  );
}

export function isSdkSinceLayout(pageType: unknown): boolean {
  return (
    pageType === undefined || pageType === 'doc' || pageType === 'doc-wide'
  );
}

export function parseSdkVersion(
  value: unknown,
  field: string,
): [number, number] {
  if (
    typeof value === 'string' &&
    value === value.trim() &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
  ) {
    const [major, minor] = value.split('.').map(Number);
    if (Number.isSafeInteger(major) && Number.isSafeInteger(minor)) {
      return [major, minor];
    }
  }
  throw new Error(`${field} must be a quoted SDK version in x.y format`);
}

function compareParsedSdkVersions(
  [leftMajor, leftMinor]: [number, number],
  [rightMajor, rightMinor]: [number, number],
): -1 | 0 | 1 {
  if (leftMajor !== rightMajor) {
    return leftMajor < rightMajor ? -1 : 1;
  }
  if (leftMinor === rightMinor) return 0;
  return leftMinor < rightMinor ? -1 : 1;
}

export function compareSdkVersions(left: unknown, right: unknown): -1 | 0 | 1 {
  return compareParsedSdkVersions(
    parseSdkVersion(left, 'leftVersion'),
    parseSdkVersion(right, 'rightVersion'),
  );
}

/** Release availability is independent of API stability and platform support. */
export function resolveSdkSince(since: unknown, latestStable: unknown) {
  const stableVersion = parseSdkVersion(latestStable, 'latestStable');
  if (since === undefined) return null;
  const sinceVersion = parseSdkVersion(since, 'since');
  return {
    since: since as string,
    isAheadOfStable: compareParsedSdkVersions(sinceVersion, stableVersion) > 0,
  };
}

/** Hiding a capsule does not remove the page's version fact from Markdown. */
export function shouldHideSdkSince(
  since: string,
  baseline: string | undefined,
): boolean {
  return baseline !== undefined && compareSdkVersions(since, baseline) <= 0;
}
