import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import npa from 'npm-package-arg';
import { maxSatisfying, minSatisfying } from 'semver';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const manifestPath = 'packages/lynx-example-packages/package.json';
const expectedPackageScope = '@lynx-example/';
const expectedRepositoryType = 'git';
const expectedRepositoryUrl =
  'git+https://github.com/lynx-family/lynx-examples.git';
const npmRegistry = 'https://registry.npmjs.org/';
const allowedSpecTypes = new Set(['version', 'range']);

/**
 * Require the canonical metadata published by lynx-examples. This check is
 * intentionally stricter than URL equivalence so release metadata cannot drift.
 */
function hasExpectedRepository(repository) {
  return (
    repository &&
    typeof repository === 'object' &&
    repository.type === expectedRepositoryType &&
    repository.url === expectedRepositoryUrl
  );
}

/**
 * The downstream core-example flow only supports packages in this namespace.
 */
function hasExpectedPackageName(name) {
  return typeof name === 'string' && name.startsWith(expectedPackageScope);
}

function repositoryDescription(repository) {
  if (typeof repository === 'string') {
    return repository;
  }
  if (!repository || typeof repository !== 'object') {
    return '<missing>';
  }
  return `${repository.type ?? '<missing>'} ${repository.url ?? '<missing>'}`;
}

/**
 * Select a range's lowest and highest published satisfying versions by SemVer,
 * independently of registry response order.
 */
function manifestsToCheck(parsed, manifest) {
  const candidates = Array.isArray(manifest) ? manifest : [manifest];
  if (parsed.type === 'version') {
    return candidates;
  }

  const versions = candidates
    .map((candidate) => candidate?.version)
    .filter((version) => typeof version === 'string');
  const lowest = minSatisfying(versions, parsed.rawSpec);
  const highest = maxSatisfying(versions, parsed.rawSpec);
  if (!lowest || !highest) {
    return [];
  }
  return candidates.filter(
    (candidate) =>
      candidate?.version === lowest || candidate?.version === highest,
  );
}

/**
 * Build a consistent diagnostic payload for a rejected dependency.
 */
function baseViolation(dependency, spec) {
  return {
    aggregator: manifestPath,
    dependency,
    spec,
    resolvedPackage: '<not resolved>',
    actualSource: '<not resolved>',
    expectedSource: `${expectedRepositoryType} ${expectedRepositoryUrl}`,
  };
}

/**
 * Read published package metadata from the public registry. The temporary cwd
 * avoids applying pnpm-only repository configuration to the npm subprocess.
 */
export function viewPackage(packageSpec) {
  return JSON.parse(
    execFileSync(
      'npm',
      [
        'view',
        packageSpec,
        'name',
        'version',
        'repository',
        '--json',
        `--registry=${npmRegistry}`,
      ],
      {
        // Avoid pnpm-only repository .npmrc settings that npm warns about.
        cwd: tmpdir(),
        encoding: 'utf8',
      },
    ),
  );
}

/**
 * Validate one core example dependency without assuming its npm scope proves
 * ownership. Only direct registry versions and ranges are compatible with the
 * downstream core-example mapping.
 */
export function validateDependency(
  dependency,
  spec,
  { manifestDirectory = repoRoot, getPackageManifest = viewPackage } = {},
) {
  let parsed;
  try {
    parsed = npa.resolve(dependency, spec, manifestDirectory);
  } catch (error) {
    return {
      ...baseViolation(dependency, spec),
      specType: '<invalid>',
      problem: `Could not parse dependency spec: ${error.message}`,
    };
  }

  if (!allowedSpecTypes.has(parsed.type)) {
    return {
      ...baseViolation(dependency, spec),
      specType: parsed.type,
      problem:
        'Unsupported dependency spec type. Only direct registry versions and ranges are allowed.',
    };
  }

  let manifest;
  try {
    manifest = getPackageManifest(`${parsed.name}@${parsed.rawSpec}`);
  } catch (error) {
    return {
      ...baseViolation(dependency, spec),
      specType: parsed.type,
      problem: `Could not resolve package manifest: ${error.message}`,
    };
  }

  const candidates = manifestsToCheck(parsed, manifest);
  if (candidates.length === 0) {
    return {
      ...baseViolation(dependency, spec),
      specType: parsed.type,
      problem: 'Could not resolve a published package manifest.',
    };
  }

  // A range's endpoints represent its declared compatibility floor and the
  // version a fresh downstream install will select.
  for (const candidate of candidates) {
    const resolvedPackage = candidate?.name ?? parsed.name ?? dependency;
    if (!hasExpectedPackageName(candidate?.name)) {
      return {
        ...baseViolation(dependency, spec),
        specType: parsed.type,
        resolvedPackage,
        actualSource: repositoryDescription(candidate?.repository),
        problem: `Resolved package name must use the ${expectedPackageScope} namespace.`,
      };
    }
    if (!hasExpectedRepository(candidate?.repository)) {
      return {
        ...baseViolation(dependency, spec),
        specType: parsed.type,
        resolvedPackage,
        actualSource: repositoryDescription(candidate?.repository),
        problem: 'Resolved package repository metadata is not canonical.',
      };
    }
  }

  return undefined;
}

/**
 * Validate every dependency declared by the core example aggregator, preserving
 * all independent failures for one actionable CI result.
 */
export function validateAggregator(packageManifest, options = {}) {
  const dependencies = Object.entries(packageManifest.dependencies ?? {});
  return dependencies
    .map(([dependency, spec]) => validateDependency(dependency, spec, options))
    .filter(Boolean);
}

/**
 * Load the checked aggregator package manifest and return its policy violations.
 */
export async function checkExamplePackageProvenance({
  root = repoRoot,
  getPackageManifest,
} = {}) {
  const packageManifest = JSON.parse(
    await readFile(path.join(root, manifestPath), 'utf8'),
  );
  return validateAggregator(packageManifest, {
    manifestDirectory: path.dirname(path.join(root, manifestPath)),
    getPackageManifest,
  });
}

/**
 * Render rejected dependencies in a CI-friendly, copyable diagnostic format.
 */
export function formatViolations(violations) {
  return [
    'Invalid example package provenance:',
    ...violations.flatMap((violation, index) => [
      ...(index === 0 ? [] : ['']),
      `  Aggregator: ${violation.aggregator}`,
      `  Dependency: ${violation.dependency}`,
      `  Spec: ${violation.spec}`,
      `  Spec type: ${violation.specType}`,
      `  Resolved package: ${violation.resolvedPackage}`,
      `  Actual source: ${violation.actualSource}`,
      `  Expected source: ${violation.expectedSource}`,
      `  Problem: ${violation.problem}`,
    ]),
  ].join('\n');
}

async function run() {
  const violations = await checkExamplePackageProvenance();
  if (violations.length === 0) {
    console.log(
      'Dependency provenance passed: core example packages use the canonical registry contract.',
    );
    return;
  }
  console.error(formatViolations(violations));
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  run().catch((error) => {
    console.error(
      `Could not validate example package provenance: ${error.message}`,
    );
    process.exitCode = 1;
  });
}
