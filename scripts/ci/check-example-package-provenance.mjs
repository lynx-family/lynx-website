import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import npa from 'npm-package-arg';
import { maxSatisfying, minSatisfying } from 'semver';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const expectedRepositoryType = 'git';
const npmRegistry = 'https://registry.npmjs.org/';
const allowedSpecTypes = new Set(['version', 'range']);

/**
 * These manifests feed different in-repo and downstream example-processing
 * paths. core and lynx-ui use separately configured `lynx-example.js` runs,
 * while lynxtron uses `lynxtron-examples.js`; downstream consumers rely on the
 * same script contracts. Provenance prevents a package from another upstream
 * from entering the wrong path.
 *
 * Package prefixes identify the intended family, and repository metadata
 * verifies its canonical source. lynx-ui deliberately uses a narrower prefix
 * because it shares @lynx-example with core examples.
 */
export const exampleAggregators = [
  {
    id: 'core',
    manifestPath: 'packages/lynx-example-packages/package.json',
    expectedPackagePrefix: '@lynx-example/',
    expectedRepositoryUrl:
      'git+https://github.com/lynx-family/lynx-examples.git',
  },
  {
    id: 'lynx-ui',
    manifestPath: 'packages/lynx-ui-example-packages/package.json',
    expectedPackagePrefix: '@lynx-example/lynx-ui-',
    expectedRepositoryUrl: 'git+https://github.com/lynx-family/lynx-ui.git',
  },
  {
    id: 'lynxtron',
    manifestPath: 'packages/lynxtron-example-packages/package.json',
    expectedPackagePrefix: '@lynxtron-examples/',
    expectedRepositoryUrl:
      'git+https://github.com/lynx-community/lynxtron-examples.git',
  },
];

/**
 * Require each package family's canonical repository identity from npm's
 * normalized registry metadata. Published tarballs may retain an equivalent
 * source URL spelling.
 */
function hasExpectedRepository(repository, expectedRepositoryUrl) {
  return (
    repository &&
    typeof repository === 'object' &&
    repository.type === expectedRepositoryType &&
    repository.url === expectedRepositoryUrl
  );
}

/**
 * Each aggregator consumes a distinct package family from its canonical source.
 */
function hasExpectedPackageName(name, expectedPackagePrefix) {
  return typeof name === 'string' && name.startsWith(expectedPackagePrefix);
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
function baseViolation(dependency, spec, aggregator) {
  return {
    aggregator: aggregator.manifestPath,
    dependency,
    spec,
    resolvedPackage: '<not resolved>',
    actualSource: '<not resolved>',
    expectedSource: `${expectedRepositoryType} ${aggregator.expectedRepositoryUrl}`,
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
 * Validate one example dependency without assuming its npm scope proves
 * ownership. Only direct registry versions and ranges are compatible with the
 * downstream aggregator contract.
 */
export function validateDependency(
  dependency,
  spec,
  {
    aggregator,
    manifestDirectory = repoRoot,
    getPackageManifest = viewPackage,
  },
) {
  let parsed;
  try {
    parsed = npa.resolve(dependency, spec, manifestDirectory);
  } catch (error) {
    return {
      ...baseViolation(dependency, spec, aggregator),
      specType: '<invalid>',
      problem: `Could not parse dependency spec: ${error.message}`,
    };
  }

  if (!allowedSpecTypes.has(parsed.type)) {
    return {
      ...baseViolation(dependency, spec, aggregator),
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
      ...baseViolation(dependency, spec, aggregator),
      specType: parsed.type,
      problem: `Could not resolve package manifest: ${error.message}`,
    };
  }

  const candidates = manifestsToCheck(parsed, manifest);
  if (candidates.length === 0) {
    return {
      ...baseViolation(dependency, spec, aggregator),
      specType: parsed.type,
      problem: 'Could not resolve a published package manifest.',
    };
  }

  // A range's endpoints represent its declared compatibility floor and the
  // version a fresh downstream install will select.
  for (const candidate of candidates) {
    const resolvedPackage = candidate?.name ?? parsed.name ?? dependency;
    if (
      !hasExpectedPackageName(candidate?.name, aggregator.expectedPackagePrefix)
    ) {
      return {
        ...baseViolation(dependency, spec, aggregator),
        specType: parsed.type,
        resolvedPackage,
        actualSource: repositoryDescription(candidate?.repository),
        problem: `Resolved package name must start with ${aggregator.expectedPackagePrefix}.`,
      };
    }
    if (
      !hasExpectedRepository(
        candidate?.repository,
        aggregator.expectedRepositoryUrl,
      )
    ) {
      return {
        ...baseViolation(dependency, spec, aggregator),
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
 * Validate every dependency declared by an example aggregator, preserving all
 * independent failures for one actionable CI result.
 */
export function validateAggregator(packageManifest, options = {}) {
  const dependencies = Object.entries(packageManifest.dependencies ?? {});
  return dependencies
    .map(([dependency, spec]) => validateDependency(dependency, spec, options))
    .filter(Boolean);
}

/**
 * Load every checked aggregator manifest and return its policy violations.
 */
export async function checkExamplePackageProvenance({
  root = repoRoot,
  getPackageManifest,
} = {}) {
  const violations = [];
  // Report drift across all aggregators in one CI run instead of failing after
  // the first manifest with policy violations.
  for (const aggregator of exampleAggregators) {
    const absoluteManifestPath = path.join(root, aggregator.manifestPath);
    const packageManifest = JSON.parse(
      await readFile(absoluteManifestPath, 'utf8'),
    );
    violations.push(
      ...validateAggregator(packageManifest, {
        aggregator,
        manifestDirectory: path.dirname(absoluteManifestPath),
        getPackageManifest,
      }),
    );
  }
  return violations;
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
      'Dependency provenance passed: example aggregators use their canonical registry contracts.',
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
