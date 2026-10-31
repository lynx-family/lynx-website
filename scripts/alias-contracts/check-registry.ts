/**
 * Gate 1 structural validator for the portable alias registry.
 *
 * This file validates registry data, consumer-supplied physical mappings, and
 * additive consumer-private aliases.
 * It deliberately does not inspect Rspress/TypeScript resolver behavior or
 * scan source imports; later gates own those checks.
 *
 * The exported functions serve two entry points:
 * - Tests and other tooling call `validateAliasContracts` directly.
 * - OSS and downstream CI call `runCli`, optionally supplying local source
 *   areas, resolver overrides, and alias extensions without replacing OSS policy.
 */
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspect } from 'node:util';

import {
  aliases,
  ossResolverOverrides,
  ossSourceAreas,
  owners,
} from './registry.js';
import type {
  AliasContract,
  Owner,
  ResolverOverride,
  SourceArea,
} from './types.js';
const scriptPath = fileURLToPath(import.meta.url);
// Dynamic consumer modules are untyped at this boundary. `isRecord` verifies
// their container shape, then the validator checks every accessed field.
type UnknownRecord = Record<string, any>;

interface ContractInput {
  owners: unknown;
  aliases: unknown;
  aliasExtensions?: unknown;
  sourceAreas: unknown;
  resolverOverrides: unknown;
  sourceAreaPolicy?: unknown;
}

type RegistryDefaults = Omit<
  ContractInput,
  'sourceAreaPolicy' | 'aliasExtensions'
>;

// Keep an unexported policy copy before consumer modules can mutate registry
// exports. Later runCli calls in the same process must use the same OSS policy.
const sharedDefaults: RegistryDefaults = structuredClone({
  owners,
  aliases,
  sourceAreas: ossSourceAreas,
  resolverOverrides: ossResolverOverrides,
});

export interface CliOptions {
  help?: true;
  sourceMap?: string;
  resolverOverrides?: string;
  aliasExtensions?: string;
}

// Closed vocabularies are schema, not policy. The concrete owners, aliases,
// source areas, and overrides remain data in registry.ts.
const visibilityValues = new Set(['public', 'owner-private']);
const aliasKinds = new Set(['exact', 'bare-and-subpaths', 'subpaths-only']);
const sourceRoles = new Set(['authoritative', 'mounted', 'generated']);
const overrideKinds = new Set(['package-compatibility']);
const downstreamImplementationValues = new Set(['required', 'optional']);
const stableChangePolicyValues = new Set([
  'breaking-change',
  'owner-controlled',
  'producer-controlled',
  'framework-controlled',
]);
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Malformed adapter fields must produce diagnostics without invoking toString.
function describe(value: unknown): string {
  return typeof value === 'string'
    ? value
    : inspect(value, { depth: 0, customInspect: false });
}

function aliasLifecycleErrors(lifecycle: unknown, label: string): string[] {
  if (!isRecord(lifecycle)) {
    return [`${label} must declare lifecycle policy`];
  }

  const errors: string[] = [];

  if (lifecycle.state === 'stable') {
    if (!nonEmptyString(lifecycle.changePolicy)) {
      errors.push(`${label} stable lifecycle must declare a change policy`);
    } else if (!stableChangePolicyValues.has(lifecycle.changePolicy)) {
      errors.push(
        `${label} stable lifecycle has unknown change policy '${lifecycle.changePolicy}'`,
      );
    }
    if (lifecycle.removalCondition !== undefined) {
      errors.push(
        `${label} stable lifecycle must not declare a removal condition`,
      );
    }
  } else if (lifecycle.state === 'migration') {
    if (!nonEmptyString(lifecycle.removalCondition)) {
      errors.push(
        `${label} migration lifecycle must declare a removal condition`,
      );
    }
    if (lifecycle.changePolicy !== undefined) {
      errors.push(
        `${label} migration lifecycle must not declare a change policy`,
      );
    }
  } else if (nonEmptyString(lifecycle.state)) {
    errors.push(`${label} has unknown lifecycle state '${lifecycle.state}'`);
  } else {
    errors.push(
      `${label} must declare lifecycle state 'stable' or 'migration'`,
    );
  }

  return errors;
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

function referenceErrors(
  value: unknown,
  known: ReadonlySet<string>,
  label: string,
  noun = 'owner',
  nonEmpty = false,
): string[] {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) {
    return [`${label} must be ${nonEmpty ? 'a non-empty' : 'an'} array`];
  }
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!nonEmptyString(entry) || !known.has(entry)) {
      errors.push(`${label} references unknown ${noun} '${describe(entry)}'`);
      continue;
    }
    if (seen.has(entry)) {
      errors.push(`${label} contains duplicate ${noun} '${entry}'`);
    }
    seen.add(entry);
  }
  return errors;
}

function repositoryRelativePathProblem(
  root: unknown,
  allowGlob: boolean,
): string | undefined {
  if (!nonEmptyString(root)) {
    return 'must be a non-empty repository-relative path';
  }
  if (
    path.posix.isAbsolute(root) ||
    /^[A-Za-z]:/.test(root) ||
    root.startsWith('\\\\')
  ) {
    return 'must be repository-relative, not absolute';
  }
  if (
    root.includes('\\') ||
    (!allowGlob && root.includes('*')) ||
    root === '.' ||
    root.endsWith('/') ||
    root.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    return 'must be a normalized repository-relative path';
  }
  return undefined;
}

function sourceRootProblem(root: unknown): string | undefined {
  return repositoryRelativePathProblem(root, false);
}

function sourceOriginRootProblem(root: unknown): string | undefined {
  return repositoryRelativePathProblem(root, true);
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

// An override overlaps alias policy when an alias owns the exact specifier
// or its direct-subpath namespace.
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
  return alias.kind !== 'exact';
}

/**
 * Validate the Gate 1 registry structure without reading resolver config or
 * source files. Shared owners and aliases remain OSS policy; consumer aliases
 * are constrained additions, validated together with the shared namespace.
 */
export function validateAliasContracts({
  owners: ownerRecords,
  aliases: aliasRecords,
  aliasExtensions = [],
  sourceAreas,
  resolverOverrides,
  sourceAreaPolicy = undefined,
}: ContractInput): string[] {
  const errors = [];
  const ownerList = Array.isArray(ownerRecords) ? ownerRecords : [];
  const extensionList = Array.isArray(aliasExtensions) ? aliasExtensions : [];
  // Append without key-based merging: collisions must fail, never replace
  // shared policy or become dependent on extension order.
  const aliasList = [
    ...(Array.isArray(aliasRecords) ? aliasRecords : []),
    ...extensionList,
  ];
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
  if (!Array.isArray(aliasExtensions)) {
    errors.push('aliasExtensions must be an array');
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
    if (!isRecord(owner) || !nonEmptyString(owner.description)) {
      errors.push(`owners[${index}] must declare a non-empty description`);
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

  // Index physical source areas before checking requiredAreas references.
  const sourceAreaIds = new Set<string>();
  const sourceAreaOwners = new Map<string, string>();
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
      errors.push(
        `${label} references unknown owner '${describe(area.owner)}'`,
      );
    } else {
      sourceAreaOwners.set(area.id, area.owner);
    }
    if (!sourceRoles.has(area.role)) {
      errors.push(`${label} has unknown source role '${describe(area.role)}'`);
    }
    const rootProblem = sourceRootProblem(area.root);
    if (rootProblem) {
      errors.push(
        `${label} root '${describe(area.root ?? '')}' ${rootProblem}`,
      );
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
            continue;
          }
          const originRootProblem = sourceOriginRootProblem(origin.root);
          if (originRootProblem) {
            errors.push(
              `${label} origins[${originIndex}] root '${origin.root}' ${originRootProblem}`,
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

  // Consumer extensions refine the shared schema, rather than bypassing it.
  // The common private-owner and source/target checks below enforce the rest.
  for (const [index, extension] of extensionList.entries()) {
    const label = nonEmptyString(extension?.id)
      ? `alias extension '${extension.id}'`
      : `aliasExtensions[${index}]`;
    if (!isRecord(extension)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (extension.owner !== 'consumer') {
      errors.push(`${label} must be owned by 'consumer'`);
    }
    if (extension.visibility !== 'owner-private') {
      errors.push(`${label} must be owner-private`);
    }
    if (isRecord(extension.implementationSources)) {
      const { requiredAreas, additionalOwners } =
        extension.implementationSources;
      if (!Array.isArray(requiredAreas) || requiredAreas.length === 0) {
        errors.push(
          `${label} implementationSources.requiredAreas must be a non-empty array`,
        );
      }
      if (!Array.isArray(additionalOwners) || additionalOwners.length !== 0) {
        errors.push(
          `${label} implementationSources.additionalOwners must be empty`,
        );
      }
    }
  }

  // Validate all alias policy. Concrete direct subpaths are intentionally
  // absent: later gates derive them from real import corpora.
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
      errors.push(
        `${label} references unknown owner '${describe(alias.owner)}'`,
      );
    }
    if (!visibilityValues.has(alias.visibility)) {
      errors.push(
        `${label} has unknown visibility '${describe(alias.visibility)}'`,
      );
    }
    if (!aliasKinds.has(alias.kind)) {
      errors.push(`${label} has unknown alias kind '${describe(alias.kind)}'`);
    }
    errors.push(
      ...referenceErrors(
        alias.allowedImporters,
        ownerIds,
        `${label} allowedImporters`,
      ),
    );
    if (
      alias.visibility === 'owner-private' &&
      (!Array.isArray(alias.allowedImporters) ||
        alias.allowedImporters.length !== 1 ||
        alias.allowedImporters[0] !== alias.owner)
    ) {
      errors.push(
        `${label} is owner-private and may only be imported by owner '${describe(alias.owner)}'`,
      );
    }
    if (alias.kind === 'exact') {
      if (alias.subpaths !== undefined) {
        errors.push(`${label} is exact and must not declare subpath policy`);
      }
    } else if (aliasKinds.has(alias.kind)) {
      if (!isRecord(alias.subpaths)) {
        errors.push(`${label} must declare subpath policy`);
      } else {
        errors.push(
          ...referenceErrors(
            alias.subpaths.targetOwners,
            ownerIds,
            `${label} subpath targetOwners`,
            'owner',
            true,
          ),
        );
        if (
          alias.visibility === 'owner-private' &&
          Array.isArray(alias.subpaths.targetOwners) &&
          alias.subpaths.targetOwners.some((owner) => owner !== alias.owner)
        ) {
          errors.push(
            `${label} is owner-private and subpath targetOwners may only contain owner '${describe(alias.owner)}'`,
          );
        }
        errors.push(
          ...aliasLifecycleErrors(
            alias.subpaths.lifecycle,
            `${label} subpaths`,
          ),
        );
      }
    }
    if (alias.kind === 'exact' || alias.kind === 'bare-and-subpaths') {
      errors.push(
        ...referenceErrors(
          alias.bareTargetOwners,
          ownerIds,
          `${label} bareTargetOwners`,
          'owner',
          true,
        ),
      );
      if (
        alias.visibility === 'owner-private' &&
        Array.isArray(alias.bareTargetOwners) &&
        alias.bareTargetOwners.some((owner) => owner !== alias.owner)
      ) {
        errors.push(
          `${label} is owner-private and bareTargetOwners may only contain owner '${describe(alias.owner)}'`,
        );
      }
    } else if (
      aliasKinds.has(alias.kind) &&
      alias.bareTargetOwners !== undefined
    ) {
      errors.push(
        `${label} has no bare entry and must not declare bareTargetOwners`,
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
    if (!isRecord(alias.implementationSources)) {
      errors.push(`${label} must declare implementationSources`);
    } else {
      const targetOwners = new Set<string>([
        ...(Array.isArray(alias.bareTargetOwners)
          ? alias.bareTargetOwners
          : []),
        ...(isRecord(alias.subpaths) &&
        Array.isArray(alias.subpaths.targetOwners)
          ? alias.subpaths.targetOwners
          : []),
      ]);
      const { requiredAreas, additionalOwners } = alias.implementationSources;
      errors.push(
        ...referenceErrors(
          requiredAreas,
          sourceAreaIds,
          `${label} implementationSources.requiredAreas`,
          'required source area',
        ),
        ...referenceErrors(
          additionalOwners,
          ownerIds,
          `${label} implementationSources.additionalOwners`,
          'additional source owner',
        ),
      );
      if (Array.isArray(requiredAreas)) {
        for (const sourceArea of requiredAreas) {
          const sourceAreaOwner = sourceAreaOwners.get(sourceArea);
          if (sourceAreaOwner && !targetOwners.has(sourceAreaOwner)) {
            errors.push(
              `${label} required source area '${sourceArea}' has owner '${sourceAreaOwner}' outside its target owner policy`,
            );
          }
        }
      }
      if (Array.isArray(additionalOwners)) {
        for (const owner of additionalOwners) {
          if (ownerIds.has(owner) && !targetOwners.has(owner)) {
            errors.push(
              `${label} additional source owner '${owner}' is outside its target owner policy`,
            );
          }
        }
      }
    }
    errors.push(...aliasLifecycleErrors(alias.lifecycle, label));
    if (isRecord(alias.downstream)) {
      if (
        !downstreamImplementationValues.has(alias.downstream.implementation)
      ) {
        errors.push(
          `${label} has unknown downstream implementation policy '${describe(alias.downstream.implementation)}'`,
        );
      }
      if (
        (alias.kind === 'exact' || alias.kind === 'bare-and-subpaths') &&
        typeof alias.downstream.mayExtendBare !== 'boolean'
      ) {
        errors.push(`${label} downstream mayExtendBare must be a boolean`);
      } else if (
        aliasKinds.has(alias.kind) &&
        alias.kind !== 'exact' &&
        alias.kind !== 'bare-and-subpaths' &&
        alias.downstream.mayExtendBare !== undefined
      ) {
        errors.push(
          `${label} has no bare entry and must not declare downstream mayExtendBare`,
        );
      }
      if (alias.downstream.mayExtendBare === true) {
        if (
          !Array.isArray(alias.bareTargetOwners) ||
          !alias.bareTargetOwners.includes('consumer')
        ) {
          errors.push(
            `${label} permits bare extension and must allow 'consumer' as a bare target owner`,
          );
        }
        if (
          !isRecord(alias.implementationSources) ||
          !Array.isArray(alias.implementationSources.additionalOwners) ||
          !alias.implementationSources.additionalOwners.includes('consumer')
        ) {
          errors.push(
            `${label} permits bare extension and must allow 'consumer' as an additional source owner`,
          );
        }
      }
    } else {
      errors.push(`${label} must declare downstream implementation policy`);
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
        !(
          aliasCoversSpecifier(leftAlias, rightAlias.specifier) ||
          aliasCoversSpecifier(rightAlias, leftAlias.specifier)
        )
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
      errors.push(
        `${label} has unknown override kind '${describe(override.kind)}'`,
      );
    }
    if (override.match !== 'exact') {
      errors.push(`${label} must use exact matching`);
    }
    if (!nonEmptyString(override.reason)) {
      errors.push(`${label} must declare a reason`);
    }
    if (
      !isRecord(override.parity) ||
      override.parity.runtime !== 'override-required' ||
      override.parity.typescript !== 'not-applicable'
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
      nonEmptyString(override.specifier) &&
      aliasList.some((alias) => aliasCoversSpecifier(alias, override.specifier))
    ) {
      errors.push(
        `${label} specifier '${override.specifier}' overlaps a declared alias`,
      );
    }
  }

  return errors;
}

// Keep argument parsing strict because these option names and module export
// contracts are consumed directly from the packaged downstream CLI.
export function parseArguments(args: readonly string[]): CliOptions {
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
          : argument === '--alias-extensions'
            ? 'aliasExtensions'
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
  exportName: 'sourceAreas' | 'resolverOverrides' | 'aliasExtensions',
  cwd: string,
): Promise<unknown> {
  const consumerModule = await import(moduleUrl(modulePath, cwd));
  // Consumer modules can add local data and private aliases, but cannot
  // redefine the shared owner or alias policy.
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
  const data: unknown = consumerModule[exportName];
  // A supplied undefined export is malformed, not an omitted CLI option.
  if (!Array.isArray(data)) {
    throw new Error(`${modulePath}: ${exportName} must be an array`);
  }
  return data;
}

/**
 * Run the dependency-free CLI against OSS data and optional consumer modules.
 * Returns a process exit code so tests can exercise it in-process.
 */
export async function runCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
  defaults: RegistryDefaults = sharedDefaults,
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
      'Usage: node --import tsx scripts/alias-contracts/check-registry.ts [--source-map <module>] [--resolver-overrides <module>] [--alias-extensions <module>]',
    );
    return 0;
  }

  try {
    await loadContracts(options, cwd, defaults);
  } catch (error) {
    console.error(`Alias contract check failed: ${errorMessage(error)}`);
    return 1;
  }
  console.log('Alias contract validation passed.');
  return 0;
}

/** Shared, validated policy boundary for corpus and resolver consumers. */
export interface ActiveContracts {
  owners: readonly Owner[];
  aliases: readonly AliasContract[];
  sourceAreas: readonly SourceArea[];
  resolverOverrides: readonly ResolverOverride[];
}

export async function loadContracts(
  options: CliOptions = {},
  cwd = process.cwd(),
  defaults: RegistryDefaults = sharedDefaults,
): Promise<ActiveContracts> {
  let policy: RegistryDefaults;
  let sourceAreas: unknown;
  let resolverOverrides: unknown;
  let aliasExtensions: unknown = [];
  try {
    // Snapshot every default, including nested records, before the first
    // import. This also isolates explicitly supplied defaults from side effects.
    policy = structuredClone(defaults);
    sourceAreas = policy.sourceAreas;
    resolverOverrides = options.sourceMap ? [] : policy.resolverOverrides;
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
    if (options.aliasExtensions) {
      aliasExtensions = await loadConsumerData(
        options.aliasExtensions,
        'aliasExtensions',
        cwd,
      );
    }
  } catch (error) {
    throw new Error(`Cannot load alias contracts: ${errorMessage(error)}`);
  }

  const errors = validateAliasContracts({
    owners: policy.owners,
    aliases: policy.aliases,
    aliasExtensions,
    sourceAreas,
    resolverOverrides,
    sourceAreaPolicy: options.sourceMap ? policy.sourceAreas : undefined,
  });
  if (errors.length > 0) {
    throw new Error(
      `Alias contract validation failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`,
    );
  }
  return structuredClone({
    owners: policy.owners,
    aliases: [
      ...(policy.aliases as AliasContract[]),
      ...(aliasExtensions as AliasContract[]),
    ],
    sourceAreas,
    resolverOverrides,
  }) as ActiveContracts;
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
