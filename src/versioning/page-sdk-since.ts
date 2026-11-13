export interface SdkVersioning {
  latestStable: string;
  baseline?: string;
}

/** Each host owns its release state and optional capsule display baseline. */
export function validateSdkVersioning(value: SdkVersioning): SdkVersioning {
  parseSdkVersion(value.latestStable, 'sdkVersioning.latestStable');
  if (value.baseline !== undefined) {
    parseSdkVersion(value.baseline, 'sdkVersioning.baseline');
    if (resolveSdkSince(value.baseline, value.latestStable)?.prerelease) {
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

/** Release availability is independent of API stability and platform support. */
export function resolveSdkSince(since: unknown, latestStable: unknown) {
  const [stableMajor, stableMinor] = parseSdkVersion(
    latestStable,
    'latestStable',
  );
  if (since === undefined) return null;
  const [major, minor] = parseSdkVersion(since, 'since');
  return {
    since: since as string,
    prerelease:
      major > stableMajor || (major === stableMajor && minor > stableMinor),
  };
}

/** Hiding a capsule does not remove the page's version fact from Markdown. */
export function shouldHideSdkSince(
  since: string,
  baseline: string | undefined,
): boolean {
  return (
    baseline !== undefined && !resolveSdkSince(since, baseline)?.prerelease
  );
}
