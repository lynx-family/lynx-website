/**
 * Gate 1 structural validator for the portable alias registry.
 *
 * This file validates registry data and consumer-supplied physical mappings.
 * It deliberately does not inspect Rspress/TypeScript resolver behavior or
 * scan source imports; later gates own those checks.
 *
 * The exported functions serve two entry points:
 * - Tests and other tooling call `validateAliasContracts` directly.
 * - OSS and downstream CI call `runCli`, optionally supplying local source
 *   areas and resolver overrides without replacing OSS owners or aliases.
 */
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

import {
  aliases,
  ossResolverOverrides,
  ossSourceAreas,
  owners,
} from './registry.js';
const scriptPath = fileURLToPath(import.meta.url);
// Dynamic consumer modules are untyped at this boundary. `isRecord` verifies
// their container shape, then the validator checks every accessed field.
type UnknownRecord = Record<string, any>;
type PatternKind = 'exact' | 'descendants' | 'namespace';

interface SpecifierPattern {
  kind: PatternKind;
  specifier: string;
}

interface ContractInput {
  owners: unknown;
  aliases: unknown;
  sourceAreas: unknown;
  resolverOverrides: unknown;
  sourceAreaPolicy?: unknown;
}

interface RegistryDefaults {
  owners: unknown;
  aliases: unknown;
  sourceAreas: unknown;
  resolverOverrides: unknown;
}

interface CliOptions {
  help?: true;
  sourceMap?: string;
  resolverOverrides?: string;
}

// Closed vocabularies are schema, not policy. The concrete owners, aliases,
// source areas, and overrides remain data in registry.ts.
const visibilityValues = new Set([
  'public',
  'owner-private',
  'framework-adapter',
  'host-adapter',
]);
const aliasKinds = new Set([
  'exact',
  'bare-and-subpaths',
  'subpaths-only',
  'prefix-only',
]);
const subpathKinds = new Set(['module', 'namespace']);
const sourceRoles = new Set(['authoritative', 'mounted', 'generated']);
const overrideKinds = new Set(['package-compatibility']);
const downstreamImplementationValues = new Set(['required', 'optional']);
const parityValues = new Set(['override-required', 'not-applicable']);
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function importSpecifierProblem(specifier: string): string | undefined {
  if (
    specifier.includes('\\') ||
    specifier.includes('*') ||
    specifier.includes('$') ||
    specifier.startsWith('/') ||
    specifier.endsWith('/') ||
    /\s/.test(specifier) ||
    specifier
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    return 'must be a normalized import specifier without resolver syntax';
  }
  return undefined;
}

function publicSubpathProblem(subpath: string): string | undefined {
  if (
    subpath.includes('\\') ||
    subpath.includes('*') ||
    subpath.includes('$') ||
    subpath.startsWith('/') ||
    subpath.endsWith('/') ||
    /\s/.test(subpath) ||
    subpath
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    return 'must be a normalized relative subpath';
  }
  return undefined;
}

function duplicateValues(records: readonly unknown[], field: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const record of records) {
    if (!isRecord(record)) {
      continue;
    }
    const value = record?.[field];
    if (!nonEmptyString(value)) {
      continue;
    }
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
}

function sourceRootProblem(root: unknown): string | undefined {
  if (!nonEmptyString(root)) {
    return 'must be a non-empty repository-relative path';
  }
  if (
    path.posix.isAbsolute(root) ||
    /^[A-Za-z]:[\\/]/.test(root) ||
    root.startsWith('\\\\')
  ) {
    return 'must be repository-relative, not absolute';
  }
  if (
    root.includes('\\') ||
    root.includes('*') ||
    root === '.' ||
    root.endsWith('/') ||
    root.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    return 'must be a normalized repository-relative path';
  }
  return undefined;
}

function canonicalFilePath(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

function rootsOverlap(left: string, right: string): boolean {
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`)
  );
}

// An override overlaps portable policy when a registered alias already owns
// the exact specifier or a registered public namespace containing it.
function aliasCoversSpecifier(alias: unknown, specifier: string): boolean {
  if (!isRecord(alias) || !nonEmptyString(alias.specifier)) {
    return false;
  }
  if (alias.specifier === specifier) {
    return true;
  }
  if (!specifier.startsWith(`${alias.specifier}/`)) {
    return false;
  }
  if (alias.kind === 'prefix-only') {
    return true;
  }
  if (alias.kind !== 'bare-and-subpaths' && alias.kind !== 'subpaths-only') {
    return false;
  }
  const relative = specifier.slice(alias.specifier.length + 1);
  return (Array.isArray(alias.publicSubpaths) ? alias.publicSubpaths : []).some(
    (subpath: unknown) =>
      (isRecord(subpath) && subpath.path === relative) ||
      (isRecord(subpath) &&
        subpath.kind === 'namespace' &&
        relative.startsWith(`${subpath.path}/`)),
  );
}

// Reduce each alias to exact and prefix patterns, then compare the accepted
// import domains. A public namespace includes its root and descendants, while
// prefix-only aliases include descendants but reject the bare root.
function aliasPatterns(alias: unknown): SpecifierPattern[] {
  const patterns: SpecifierPattern[] = [];
  if (!isRecord(alias) || !nonEmptyString(alias.specifier)) {
    return patterns;
  }
  if (alias.supportsBare === true) {
    patterns.push({ kind: 'exact', specifier: alias.specifier });
  }
  if (alias.kind === 'prefix-only') {
    patterns.push({ kind: 'descendants', specifier: alias.specifier });
  }
  if (!Array.isArray(alias.publicSubpaths)) {
    return patterns;
  }
  for (const subpath of alias.publicSubpaths) {
    if (!isRecord(subpath) || !nonEmptyString(subpath.path)) {
      continue;
    }
    patterns.push({
      kind: subpath.kind === 'namespace' ? 'namespace' : 'exact',
      specifier: `${alias.specifier}/${subpath.path}`,
    });
  }
  return patterns;
}

function aliasPatternsOverlap(
  left: SpecifierPattern,
  right: SpecifierPattern,
): boolean {
  if (left.kind === 'exact' && right.kind === 'exact') {
    return left.specifier === right.specifier;
  }
  if (left.kind === 'exact' || right.kind === 'exact') {
    const exact = left.kind === 'exact' ? left : right;
    const prefix = left.kind === 'exact' ? right : left;
    return prefix.kind === 'namespace'
      ? exact.specifier === prefix.specifier ||
          exact.specifier.startsWith(`${prefix.specifier}/`)
      : exact.specifier.startsWith(`${prefix.specifier}/`);
  }
  return (
    left.specifier === right.specifier ||
    left.specifier.startsWith(`${right.specifier}/`) ||
    right.specifier.startsWith(`${left.specifier}/`)
  );
}

function aliasesOverlap(left: unknown, right: unknown): boolean {
  return aliasPatterns(left).some((leftPattern) =>
    aliasPatterns(right).some((rightPattern) =>
      aliasPatternsOverlap(leftPattern, rightPattern),
    ),
  );
}

/**
 * Validate the Gate 1 registry structure without reading resolver config or
 * source files. Consumer modules may replace only physical source areas and
 * repository-local overrides; aliases and owners always come from OSS policy.
 */
export function validateAliasContracts({
  owners: ownerRecords,
  aliases: aliasRecords,
  sourceAreas,
  resolverOverrides,
  sourceAreaPolicy = undefined,
}: ContractInput): string[] {
  const errors = [];
  const ownerList = Array.isArray(ownerRecords) ? ownerRecords : [];
  const aliasList = Array.isArray(aliasRecords) ? aliasRecords : [];
  const sourceAreaList = Array.isArray(sourceAreas) ? sourceAreas : [];
  const overrideList = Array.isArray(resolverOverrides)
    ? resolverOverrides
    : [];
  const sourceAreaPolicyList = Array.isArray(sourceAreaPolicy)
    ? sourceAreaPolicy
    : undefined;

  if (!Array.isArray(ownerRecords)) {
    errors.push('owners must be an array');
  }
  if (!Array.isArray(aliasRecords)) {
    errors.push('aliases must be an array');
  }
  if (!Array.isArray(sourceAreas)) {
    errors.push('sourceAreas must be an array');
  }
  if (!Array.isArray(resolverOverrides)) {
    errors.push('resolverOverrides must be an array');
  }

  // Owners establish the identities referenced by every other record.
  for (const duplicate of duplicateValues(ownerList, 'id')) {
    errors.push(`duplicate owner id '${duplicate}'`);
  }
  const ownerIds = new Set<string>(
    ownerList.filter((owner) => nonEmptyString(owner?.id)).map(({ id }) => id),
  );
  for (const [index, owner] of ownerList.entries()) {
    if (!isRecord(owner) || !nonEmptyString(owner.id)) {
      errors.push(`owners[${index}] must declare a non-empty id`);
    }
  }

  const duplicateContractIds = duplicateValues(
    [...aliasList, ...overrideList],
    'id',
  );
  for (const duplicate of duplicateContractIds) {
    errors.push(`duplicate alias or override id '${duplicate}'`);
  }
  for (const duplicate of duplicateValues(aliasList, 'specifier')) {
    errors.push(`duplicate alias specifier '${duplicate}'`);
  }
  for (const duplicate of duplicateValues(overrideList, 'specifier')) {
    errors.push(`duplicate override specifier '${duplicate}'`);
  }

  // Validate and index physical source areas before aliases resolve their
  // sourceAreas references.
  const sourceAreaIds = new Set<string>();
  for (const [index, area] of sourceAreaList.entries()) {
    const label = nonEmptyString(area?.id)
      ? `source area '${area.id}'`
      : `sourceAreas[${index}]`;
    if (!isRecord(area) || !nonEmptyString(area.id)) {
      errors.push(`${label} must declare a non-empty id`);
      continue;
    }
    if (sourceAreaIds.has(area.id)) {
      errors.push(`duplicate source area id '${area.id}'`);
    }
    sourceAreaIds.add(area.id);
    if (!ownerIds.has(area.owner)) {
      errors.push(`${label} references unknown owner '${area.owner}'`);
    }
    if (!sourceRoles.has(area.role)) {
      errors.push(`${label} has unknown source role '${area.role}'`);
    }
    const rootProblem = sourceRootProblem(area.root);
    if (rootProblem) {
      errors.push(`${label} root '${area.root ?? ''}' ${rootProblem}`);
    }
    if (area.role === 'mounted' || area.role === 'generated') {
      if (!Array.isArray(area.origins) || area.origins.length === 0) {
        errors.push(
          `${label} with role '${area.role}' must declare a non-empty origins array`,
        );
      } else {
        for (const [originIndex, origin] of area.origins.entries()) {
          if (
            !isRecord(origin) ||
            !nonEmptyString(origin.repository) ||
            !nonEmptyString(origin.root)
          ) {
            errors.push(
              `${label} origins[${originIndex}] must declare origin.repository and origin.root`,
            );
          }
        }
      }
    }
    if (area.origin !== undefined) {
      errors.push(
        `${label} must use the origins array instead of singular origin`,
      );
    }
    if (area.role === 'authoritative' && area.origins !== undefined) {
      errors.push(
        `${label} with role 'authoritative' must not declare origins`,
      );
    }
  }

  if (sourceAreaPolicyList) {
    const policyById = new Map<string, UnknownRecord>(
      sourceAreaPolicyList
        .filter((area) => nonEmptyString(area?.id))
        .map((area) => [area.id, area]),
    );
    for (const areaId of policyById.keys()) {
      if (!sourceAreaIds.has(areaId)) {
        errors.push(
          `consumer source map is missing required OSS source area '${areaId}'`,
        );
      }
    }
    for (const area of sourceAreaList) {
      if (!nonEmptyString(area?.id) || !nonEmptyString(area?.owner)) {
        continue;
      }
      const sharedArea = policyById.get(area.id);
      if (sharedArea && area.owner !== sharedArea.owner) {
        errors.push(
          `source area '${area.id}' must preserve OSS owner '${sharedArea.owner}', not '${area.owner}'`,
        );
      } else if (!sharedArea && area.owner !== 'consumer') {
        errors.push(
          `additional source area '${area.id}' must be owned by 'consumer'`,
        );
      }
    }
  }

  // Overlapping roots make importer ownership ambiguous to later scanners.
  for (let left = 0; left < sourceAreaList.length; left += 1) {
    const leftArea = sourceAreaList[left];
    if (sourceRootProblem(leftArea?.root)) {
      continue;
    }
    for (let right = left + 1; right < sourceAreaList.length; right += 1) {
      const rightArea = sourceAreaList[right];
      if (
        sourceRootProblem(rightArea?.root) ||
        !rootsOverlap(leftArea.root, rightArea.root)
      ) {
        continue;
      }
      errors.push(
        `source roots '${leftArea.root}' and '${rightArea.root}' overlap ambiguously`,
      );
    }
  }

  // Validate portable alias policy and build the complete public specifier
  // index so duplicate bare aliases and subpaths cannot hide each other.
  const publicSpecifiers = new Map<string, string>(
    aliasList
      .filter((alias) => nonEmptyString(alias?.specifier))
      .map((alias) => [alias.specifier, `alias '${alias.id}'`]),
  );
  for (const [index, alias] of aliasList.entries()) {
    const label = nonEmptyString(alias?.id)
      ? `alias '${alias.id}'`
      : `aliases[${index}]`;
    if (!isRecord(alias) || !nonEmptyString(alias.id)) {
      errors.push(`${label} must declare a non-empty id`);
      continue;
    }
    if (!nonEmptyString(alias.specifier)) {
      errors.push(`${label} must declare a non-empty specifier`);
    } else {
      const specifierProblem = importSpecifierProblem(alias.specifier);
      if (specifierProblem) {
        errors.push(
          `${label} specifier '${alias.specifier}' ${specifierProblem}`,
        );
      }
      if (alias.visibility !== 'owner-private') {
        if (alias.specifier === 'index' || alias.specifier.endsWith('/index')) {
          errors.push(
            `${label} specifier '${alias.specifier}' uses non-canonical trailing /index`,
          );
        }
        if (sourceExtension.test(alias.specifier)) {
          errors.push(
            `${label} specifier '${alias.specifier}' uses a non-canonical JavaScript/TypeScript source extension`,
          );
        }
      }
    }
    if (!ownerIds.has(alias.owner)) {
      errors.push(`${label} references unknown owner '${alias.owner}'`);
    }
    if (!visibilityValues.has(alias.visibility)) {
      errors.push(`${label} has unknown visibility '${alias.visibility}'`);
    }
    if (!aliasKinds.has(alias.kind)) {
      errors.push(`${label} has unknown alias kind '${alias.kind}'`);
    }
    if (!Array.isArray(alias.allowedImporters)) {
      errors.push(`${label} allowedImporters must be an array`);
    } else {
      for (const importer of alias.allowedImporters) {
        if (!ownerIds.has(importer)) {
          errors.push(
            `${label} references unknown importer owner '${importer}'`,
          );
        }
      }
    }
    if (
      alias.visibility === 'owner-private' &&
      (!Array.isArray(alias.allowedImporters) ||
        alias.allowedImporters.length === 0)
    ) {
      errors.push(
        `${label} is private and must declare explicit importer owners`,
      );
    }
    if (!Array.isArray(alias.publicSubpaths)) {
      errors.push(`${label} publicSubpaths must be an array`);
      continue;
    }
    const expectedSupportsBare =
      alias.kind === 'exact' || alias.kind === 'bare-and-subpaths'
        ? true
        : alias.kind === 'subpaths-only' || alias.kind === 'prefix-only'
          ? false
          : undefined;
    if (
      expectedSupportsBare !== undefined &&
      alias.supportsBare !== expectedSupportsBare
    ) {
      errors.push(
        `${label} kind '${alias.kind}' requires supportsBare to be ${expectedSupportsBare}`,
      );
    }
    if (alias.kind === 'exact' && alias.publicSubpaths.length > 0) {
      errors.push(`${label} is exact and must not declare public subpaths`);
    }
    if (alias.kind === 'prefix-only' && alias.publicSubpaths.length > 0) {
      errors.push(
        `${label} is prefix-only and must not declare public subpaths`,
      );
    }
    if (
      !isRecord(alias.canonical) ||
      typeof alias.canonical.omitIndex !== 'boolean' ||
      typeof alias.canonical.omitSourceExtensions !== 'boolean'
    ) {
      errors.push(`${label} must declare canonical spelling rules`);
    }
    if (
      alias.visibility !== 'owner-private' &&
      isRecord(alias.canonical) &&
      (alias.canonical.omitIndex !== true ||
        alias.canonical.omitSourceExtensions !== true)
    ) {
      errors.push(
        `${label} non-private aliases must enable both canonical spelling rules`,
      );
    }
    if (typeof alias.allowMultipleResolverRoots !== 'boolean') {
      errors.push(`${label} must declare its multi-root policy`);
    }
    if (!Array.isArray(alias.sourceAreas)) {
      errors.push(`${label} sourceAreas must be an array`);
    } else {
      for (const sourceArea of alias.sourceAreas) {
        if (!sourceAreaIds.has(sourceArea)) {
          errors.push(
            `${label} references unknown source area '${sourceArea}'`,
          );
        }
      }
    }
    if (
      !isRecord(alias.lifecycle) ||
      !nonEmptyString(alias.lifecycle.state) ||
      !nonEmptyString(alias.lifecycle.removalPolicy)
    ) {
      errors.push(`${label} must declare lifecycle state and removal policy`);
    }
    if (isRecord(alias.downstream)) {
      if (
        !downstreamImplementationValues.has(alias.downstream.implementation)
      ) {
        errors.push(
          `${label} has unknown downstream implementation policy '${alias.downstream.implementation}'`,
        );
      }
      if (typeof alias.downstream.mayExtendBare !== 'boolean') {
        errors.push(`${label} downstream mayExtendBare must be a boolean`);
      }
      const subpathOwner = alias.downstream.subpathOwner;
      if (subpathOwner !== null && !ownerIds.has(subpathOwner)) {
        errors.push(
          `${label} references unknown downstream subpath owner '${subpathOwner}'`,
        );
      }
    } else {
      errors.push(`${label} must declare downstream implementation policy`);
    }

    const localSubpaths = new Set<string>();
    const localSubpathPatterns: SpecifierPattern[] = [];
    for (const [subpathIndex, subpath] of alias.publicSubpaths.entries()) {
      const subpathLabel = `${label} publicSubpaths[${subpathIndex}]`;
      if (!isRecord(subpath) || !nonEmptyString(subpath.path)) {
        errors.push(`${subpathLabel} must declare a non-empty path`);
        continue;
      }
      const subpathProblem = publicSubpathProblem(subpath.path);
      if (subpathProblem) {
        errors.push(`${subpathLabel} '${subpath.path}' ${subpathProblem}`);
      }
      if (!subpathKinds.has(subpath.kind)) {
        errors.push(`${subpathLabel} has unknown kind '${subpath.kind}'`);
      }
      if (!ownerIds.has(subpath.owner)) {
        errors.push(
          `${subpathLabel} references unknown owner '${subpath.owner}'`,
        );
      }
      const fullSpecifier = `${alias.specifier}/${subpath.path}`;
      const duplicateLocalSubpath = localSubpaths.has(subpath.path);
      if (duplicateLocalSubpath || publicSpecifiers.has(fullSpecifier)) {
        errors.push(`duplicate public subpath '${fullSpecifier}'`);
      }
      if (
        !duplicateLocalSubpath &&
        !subpathProblem &&
        subpathKinds.has(subpath.kind)
      ) {
        const pattern: SpecifierPattern = {
          kind: subpath.kind === 'namespace' ? 'namespace' : 'exact',
          specifier: fullSpecifier,
        };
        const overlap = localSubpathPatterns.find((existing) =>
          aliasPatternsOverlap(existing, pattern),
        );
        if (overlap) {
          errors.push(
            `${label} public subpaths overlap semantically: '${overlap.specifier}' and '${fullSpecifier}'`,
          );
        }
        localSubpathPatterns.push(pattern);
      }
      localSubpaths.add(subpath.path);
      publicSpecifiers.set(fullSpecifier, subpathLabel);
      if (alias.visibility !== 'owner-private') {
        if (subpath.path === 'index' || subpath.path.endsWith('/index')) {
          errors.push(
            `${subpathLabel} '${subpath.path}' uses non-canonical trailing /index`,
          );
        }
        if (sourceExtension.test(subpath.path)) {
          errors.push(
            `${subpathLabel} '${subpath.path}' uses a non-canonical JavaScript/TypeScript source extension`,
          );
        }
      }
    }
  }

  // Distinct aliases must not accept any common import specifier. Otherwise
  // registry order or resolver precedence could silently choose the owner.
  for (let left = 0; left < aliasList.length; left += 1) {
    const leftAlias = aliasList[left];
    if (!isRecord(leftAlias) || !nonEmptyString(leftAlias.specifier)) {
      continue;
    }
    for (let right = left + 1; right < aliasList.length; right += 1) {
      const rightAlias = aliasList[right];
      if (
        !isRecord(rightAlias) ||
        !nonEmptyString(rightAlias.specifier) ||
        leftAlias.specifier === rightAlias.specifier ||
        !aliasesOverlap(leftAlias, rightAlias)
      ) {
        continue;
      }
      errors.push(
        `aliases '${leftAlias.specifier}' and '${rightAlias.specifier}' overlap semantically`,
      );
    }
  }

  // Resolver overrides are local exceptions. They must be complete, exact,
  // lifecycle-bound, and outside the portable alias namespace.
  for (const [index, override] of overrideList.entries()) {
    const label = nonEmptyString(override?.id)
      ? `resolver override '${override.id}'`
      : `resolverOverrides[${index}]`;
    if (!isRecord(override) || !nonEmptyString(override.id)) {
      errors.push(`${label} must declare a non-empty id`);
      continue;
    }
    if (!nonEmptyString(override.specifier)) {
      errors.push(`${label} must declare a non-empty specifier`);
    } else {
      const specifierProblem = importSpecifierProblem(override.specifier);
      if (specifierProblem) {
        errors.push(
          `${label} specifier '${override.specifier}' ${specifierProblem.replace(
            'import specifier',
            'exact import specifier',
          )}`,
        );
      }
    }
    if (!overrideKinds.has(override.kind)) {
      errors.push(`${label} has unknown override kind '${override.kind}'`);
    }
    if (override.match !== 'exact') {
      errors.push(`${label} must use exact matching`);
    }
    if (!nonEmptyString(override.reason)) {
      errors.push(`${label} must declare a reason`);
    }
    if (
      !isRecord(override.parity) ||
      !parityValues.has(override.parity.runtime) ||
      !parityValues.has(override.parity.typescript)
    ) {
      errors.push(
        `${label} must declare valid runtime and TypeScript parity expectations`,
      );
    }
    if (!nonEmptyString(override.lifecycle)) {
      errors.push(`${label} must declare a lifecycle state`);
    }
    if (!nonEmptyString(override.removalCondition)) {
      errors.push(`${label} must declare a removal condition`);
    }
    if (
      override.kind === 'package-compatibility' &&
      (override.parity?.runtime !== 'override-required' ||
        override.parity?.typescript !== 'not-applicable')
    ) {
      errors.push(
        `${label} package compatibility must be runtime-only with TypeScript parity marked not-applicable`,
      );
    }
    if (
      nonEmptyString(override.specifier) &&
      aliasList.some((alias) => aliasCoversSpecifier(alias, override.specifier))
    ) {
      errors.push(
        `${label} specifier '${override.specifier}' overlaps a portable alias`,
      );
    }
  }

  return errors;
}

// Keep argument parsing strict because these option names and module export
// contracts are consumed directly from the packaged downstream CLI.
function parseArguments(args: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help') {
      options.help = true;
      continue;
    }
    const option =
      argument === '--source-map'
        ? 'sourceMap'
        : argument === '--resolver-overrides'
          ? 'resolverOverrides'
          : undefined;
    if (!option) {
      throw new Error(`unknown argument '${argument}'`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a module path`);
    }
    options[option] = value;
    index += 1;
  }
  return options;
}

function moduleUrl(modulePath: string, cwd: string): string {
  if (modulePath.startsWith('file:')) {
    return modulePath;
  }
  return pathToFileURL(path.resolve(cwd, modulePath)).href;
}

async function loadConsumerData(
  modulePath: string,
  exportName: 'sourceAreas' | 'resolverOverrides',
  cwd: string,
): Promise<unknown> {
  const consumerModule = await import(moduleUrl(modulePath, cwd));
  // Consumers may bind physical data, but OSS remains the sole source of
  // portable owner and alias policy.
  for (const policyExport of [
    'owners',
    'aliases',
    'ossSourceAreas',
    'ossResolverOverrides',
  ]) {
    if (policyExport in consumerModule) {
      throw new Error(
        `${modulePath} must not export '${policyExport}'; consumer modules cannot redefine OSS alias policy`,
      );
    }
  }
  if (!(exportName in consumerModule)) {
    throw new Error(`${modulePath} must export '${exportName}'`);
  }
  return consumerModule[exportName];
}

/**
 * Run the dependency-free CLI against OSS data or consumer-owned physical
 * modules. Returns a process exit code so tests can exercise it in-process.
 */
export async function runCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
  defaults: RegistryDefaults = {
    owners,
    aliases,
    sourceAreas: ossSourceAreas,
    resolverOverrides: ossResolverOverrides,
  },
): Promise<number> {
  let options;
  try {
    options = parseArguments(args);
  } catch (error) {
    console.error(`Alias contract check failed: ${errorMessage(error)}`);
    return 1;
  }
  if (options.help) {
    console.log(
      'Usage: node --import tsx scripts/alias-contracts/check-registry.ts [--source-map <module>] [--resolver-overrides <module>]',
    );
    return 0;
  }

  let sourceAreas: unknown = defaults.sourceAreas;
  let resolverOverrides: unknown = options.sourceMap
    ? []
    : defaults.resolverOverrides;
  try {
    if (options.sourceMap) {
      sourceAreas = await loadConsumerData(
        options.sourceMap,
        'sourceAreas',
        cwd,
      );
    }
    if (options.resolverOverrides) {
      resolverOverrides = await loadConsumerData(
        options.resolverOverrides,
        'resolverOverrides',
        cwd,
      );
    }
  } catch (error) {
    console.error(`Alias contract check failed: ${errorMessage(error)}`);
    return 1;
  }

  const errors = validateAliasContracts({
    owners: defaults.owners,
    aliases: defaults.aliases,
    sourceAreas,
    resolverOverrides,
    sourceAreaPolicy: options.sourceMap ? defaults.sourceAreas : undefined,
  });
  if (errors.length > 0) {
    console.error('Alias contract validation failed:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    return 1;
  }
  console.log('Alias contract validation passed.');
  return 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (
  process.argv[1] &&
  canonicalFilePath(process.argv[1]) === canonicalFilePath(scriptPath)
) {
  process.exitCode = await runCli();
}
