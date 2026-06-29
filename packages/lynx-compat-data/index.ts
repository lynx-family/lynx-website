// Re-export types for easier access
export * from './types/types.d.ts';
import platforms from './platforms/platforms.json' assert { type: 'json' };

import type {
  CompatStatement,
  FlagStatement,
  Identifier,
  PlatformName,
  PlatformStatement,
  PlatformStatus,
  PlatformType,
  ReleaseStatement,
  SimpleSupportStatement,
  StatusBlock,
  SupportBlock,
  SupportStatement,
  VersionValue,
} from './types/types.js';

/**
 * Checks if a string is a valid PlatformName.
 * @param name - The string to check
 * @returns True if the string is a valid PlatformName, false otherwise
 */
export function isPlatformName(name: string): name is PlatformName {
  const validPlatforms: PlatformName[] = [
    'android',
    'clay_android',
    'clay_ios',
    'clay_macos',
    'clay_windows',
    'ios',
    'web_lynx',
  ];
  return validPlatforms.includes(name as PlatformName);
}

/**
 * Checks if a value is a valid VersionValue.
 * @param value - The value to check
 * @returns True if the value is a valid VersionValue, false otherwise
 */
export function isVersionValue(value: unknown): value is VersionValue {
  return (
    typeof value === 'string' || typeof value === 'boolean' || value === null
  );
}

/**
 * Checks if a string is a valid PlatformType.
 * @param type - The string to check
 * @returns True if the string is a valid PlatformType, false otherwise
 */
export function isPlatformType(type: string): type is PlatformType {
  return ['native', 'web', 'clay'].includes(type);
}

/**
 * Checks if a string is a valid PlatformStatus.
 * @param status - The string to check
 * @returns True if the string is a valid PlatformStatus, false otherwise
 */
export function isPlatformStatus(status: string): status is PlatformStatus {
  return ['retired', 'current', 'beta', 'planned'].includes(status);
}

/**
 * Checks if an object is a valid PlatformStatement.
 * @param obj - The object to check
 * @returns True if the object is a valid PlatformStatement, false otherwise
 */
export function isPlatformStatement(obj: unknown): obj is PlatformStatement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'type' in obj &&
    isPlatformType(obj.type) &&
    'releases' in obj &&
    typeof obj.releases === 'object'
  );
}

/**
 * Checks if an object is a valid ReleaseStatement.
 * @param obj - The object to check
 * @returns True if the object is a valid ReleaseStatement, false otherwise
 */
export function isReleaseStatement(obj: unknown): obj is ReleaseStatement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (!('release_date' in obj) || typeof obj.release_date === 'string') &&
    (!('release_notes' in obj) || typeof obj.release_notes === 'string') &&
    'status' in obj &&
    isPlatformStatus(obj.status)
  );
}

/**
 * Checks if an object is a valid Identifier.
 * @param obj - The object to check
 * @returns True if the object is a valid Identifier, false otherwise
 */
export function isIdentifier(obj: unknown): obj is Identifier {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (!('__compat' in obj) || isCompatStatement(obj.__compat))
  );
}

/**
 * Checks if an object is a valid CompatStatement.
 * @param obj - The object to check
 * @returns True if the object is a valid CompatStatement, false otherwise
 */
export function isCompatStatement(obj: unknown): obj is CompatStatement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'support' in obj &&
    typeof obj.support === 'object' &&
    (!('status' in obj) || isStatusBlock(obj.status))
  );
}

/**
 * Checks if an object is a valid StatusBlock.
 * @param obj - The object to check
 * @returns True if the object is a valid StatusBlock, false otherwise
 */
export function isStatusBlock(obj: unknown): obj is StatusBlock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'experimental' in obj &&
    typeof obj.experimental === 'boolean' &&
    'deprecated' in obj &&
    typeof obj.deprecated === 'boolean'
  );
}

/**
 * Checks if a value is a valid SupportStatement.
 * @param value - The value to check
 * @returns True if the value is a valid SupportStatement, false otherwise
 */
export function isSupportStatement(value: unknown): value is SupportStatement {
  return (
    isSimpleSupportStatement(value) ||
    (Array.isArray(value) && value.every(isSimpleSupportStatement))
  );
}

/**
 * Checks if an object is a valid SimpleSupportStatement.
 * @param obj - The object to check
 * @returns True if the object is a valid SimpleSupportStatement, false otherwise
 */
export function isSimpleSupportStatement(
  obj: unknown,
): obj is SimpleSupportStatement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'version_added' in obj &&
    isVersionValue(obj.version_added) &&
    (!('version_removed' in obj) || isVersionValue(obj.version_removed))
  );
}

/**
 * Checks if an object is a valid FlagStatement.
 * @param obj - The object to check
 * @returns True if the object is a valid FlagStatement, false otherwise
 */
export function isFlagStatement(obj: unknown): obj is FlagStatement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    (obj.type === 'preference' || obj.type === 'runtime_flag') &&
    'name' in obj &&
    typeof obj.name === 'string'
  );
}

/**
 * Checks if an object is a valid SupportBlock.
 * @param obj - The object to check
 * @returns True if the object is a valid SupportBlock, false otherwise
 */
export function isSupportBlock(obj: unknown): obj is SupportBlock {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return Object.entries(obj).every(
    ([key, value]) => isPlatformName(key) && isSupportStatement(value),
  );
}

/**
 * Gets the support statement for a specific platform from a CompatStatement.
 * @param compatStatement - The CompatStatement to extract from
 * @param platform - The platform to get the support statement for
 * @returns The SupportStatement for the specified platform, or undefined if not found
 */
export function getPlatformSupport(
  compatStatement: CompatStatement,
  platform: PlatformName,
): SupportStatement | undefined {
  return compatStatement.support[platform];
}

/**
 * Checks if a feature is supported based on its VersionValue.
 * @param version - The VersionValue to check
 * @returns True if the feature is supported, false otherwise
 */
export function isFeatureSupported(version: VersionValue): boolean {
  return version !== false && version !== null;
}

/**
 * Extracts all supported platforms from a CompatStatement.
 * @param compatStatement - The CompatStatement to extract from
 * @returns An array of supported PlatformNames
 */
export function getSupportedPlatforms(
  compatStatement: CompatStatement,
): PlatformName[] {
  return Object.entries(compatStatement.support)
    .filter(([_, support]) =>
      isFeatureSupported((support as SimpleSupportStatement).version_added),
    )
    .map(([platform]) => platform as PlatformName);
}

/**
 * Checks if a feature is experimental based on its CompatStatement.
 * @param compatStatement - The CompatStatement to check
 * @returns True if the feature is experimental, false otherwise
 */
export function isExperimental(compatStatement: CompatStatement): boolean {
  return compatStatement.status?.experimental ?? false;
}

/**
 * Checks if a feature is deprecated based on its CompatStatement.
 * @param compatStatement - The CompatStatement to check
 * @returns True if the feature is deprecated, false otherwise
 */
export function isDeprecated(compatStatement: CompatStatement): boolean {
  return compatStatement.status?.deprecated ?? false;
}

/**
 * Retrieves the human-readable name of a given platform.
 * @param platform - The PlatformName to get the name for
 * @returns The human-readable name of the platform
 */
export function getFullPlatformName(platform: PlatformName): string {
  return platforms.platforms[platform].name;
}
