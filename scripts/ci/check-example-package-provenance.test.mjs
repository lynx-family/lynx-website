import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  checkExamplePackageProvenance,
  exampleAggregators,
  formatViolations,
  validateAggregator,
  validateDependency,
} from './check-example-package-provenance.mjs';

/**
 * Generic validator tests use synthetic fixtures so they stay independent of
 * production package-family policy. The separate policy test below hard-codes
 * the real contracts, making it an independent oracle for policy drift.
 */
const fixtureAggregator = {
  manifestPath: 'fixtures/package.json',
  expectedPackagePrefix: '@fixture/',
  expectedRepositoryUrl: 'git+https://example.invalid/fixture-examples.git',
};
const fixtureRepository = {
  type: 'git',
  url: fixtureAggregator.expectedRepositoryUrl,
};

function manifest(name, repository, version = '1.0.0') {
  return {
    name,
    version,
    repository: arguments.length === 1 ? fixtureRepository : repository,
  };
}

function validateFixtureDependency(dependency, spec, options = {}) {
  return validateDependency(dependency, spec, {
    ...options,
    aggregator: fixtureAggregator,
  });
}

test('defines the canonical policy for every example aggregator', () => {
  assert.deepEqual(exampleAggregators, [
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
  ]);
});

test('checks and aggregates provenance violations from every manifest', async (t) => {
  const root = await mkdtemp(
    path.join(tmpdir(), 'example-package-provenance-'),
  );
  t.after(() => rm(root, { recursive: true, force: true }));

  const aggregatorsById = Object.fromEntries(
    exampleAggregators.map((aggregator) => [aggregator.id, aggregator]),
  );
  const cases = [
    {
      aggregator: aggregatorsById.core,
      dependency: '@lynx-example/core-view',
      publishedManifest: manifest(
        '@other-scope/core-view',
        {
          type: 'git',
          url: aggregatorsById.core.expectedRepositoryUrl,
        },
        '1.0.0',
      ),
    },
    {
      aggregator: aggregatorsById['lynx-ui'],
      dependency: '@lynx-example/lynx-ui-button',
      publishedManifest: manifest(
        '@lynx-example/lynx-ui-button',
        {
          type: 'git',
          url: aggregatorsById.core.expectedRepositoryUrl,
        },
        '1.0.0',
      ),
    },
    {
      aggregator: aggregatorsById.lynxtron,
      dependency: '@lynxtron-examples/browser',
      publishedManifest: manifest(
        '@lynxtron-examples/browser',
        {
          type: 'git',
          url: aggregatorsById.lynxtron.expectedRepositoryUrl,
        },
        '1.0.0',
      ),
    },
  ];
  const publishedManifests = new Map();

  for (const { aggregator, dependency, publishedManifest } of cases) {
    const absoluteManifestPath = path.join(root, aggregator.manifestPath);
    await mkdir(path.dirname(absoluteManifestPath), { recursive: true });
    await writeFile(
      absoluteManifestPath,
      JSON.stringify({
        dependencies: {
          [dependency]: '1.0.0',
        },
      }),
    );
    publishedManifests.set(`${dependency}@1.0.0`, publishedManifest);
  }

  const queriedPackageSpecs = [];
  const violations = await checkExamplePackageProvenance({
    root,
    getPackageManifest(packageSpec) {
      queriedPackageSpecs.push(packageSpec);
      assert.ok(
        publishedManifests.has(packageSpec),
        `unexpected package query: ${packageSpec}`,
      );
      return publishedManifests.get(packageSpec);
    },
  });

  assert.deepEqual(queriedPackageSpecs, [
    '@lynx-example/core-view@1.0.0',
    '@lynx-example/lynx-ui-button@1.0.0',
    '@lynxtron-examples/browser@1.0.0',
  ]);
  assert.deepEqual(
    violations.map(({ aggregator, dependency, expectedSource, problem }) => ({
      aggregator,
      dependency,
      expectedSource,
      problem,
    })),
    [
      {
        aggregator: aggregatorsById.core.manifestPath,
        dependency: '@lynx-example/core-view',
        expectedSource: `git ${aggregatorsById.core.expectedRepositoryUrl}`,
        problem: 'Resolved package name must start with @lynx-example/.',
      },
      {
        aggregator: aggregatorsById['lynx-ui'].manifestPath,
        dependency: '@lynx-example/lynx-ui-button',
        expectedSource: `git ${
          aggregatorsById['lynx-ui'].expectedRepositoryUrl
        }`,
        problem: 'Resolved package repository metadata is not canonical.',
      },
    ],
  );
});

test('accepts canonical repository metadata', () => {
  let packageSpec;
  const violation = validateFixtureDependency('@fixture/view', '^0.6.5', {
    getPackageManifest(spec) {
      packageSpec = spec;
      return manifest(
        '@fixture/view',
        {
          ...fixtureRepository,
          directory: 'examples/view',
        },
        '0.6.5',
      );
    },
  });

  assert.equal(violation, undefined);
  assert.equal(packageSpec, '@fixture/view@^0.6.5');
});

test('requires the resolved package name to use the expected scope', () => {
  const violation = validateFixtureDependency('@fixture/view', '0.6.5', {
    getPackageManifest: () => manifest('@other-scope/view'),
  });

  assert.equal(violation.resolvedPackage, '@other-scope/view');
  assert.equal(
    violation.problem,
    'Resolved package name must start with @fixture/.',
  );
});

test('rejects packages from another repository', () => {
  const violation = validateFixtureDependency('@fixture/button', '0.0.8', {
    getPackageManifest: () =>
      manifest(
        '@fixture/button',
        {
          type: 'git',
          url: 'git+https://other.example.invalid/other-examples.git',
        },
        '0.0.8',
      ),
  });

  assert.equal(
    violation.actualSource,
    'git git+https://other.example.invalid/other-examples.git',
  );
  assert.equal(violation.expectedSource, `git ${fixtureRepository.url}`);
});

test('requires the canonical repository type and URL', () => {
  for (const repository of [
    undefined,
    fixtureRepository.url,
    { type: 'git', url: fixtureRepository.url.replace('git+', '') },
    {
      type: 'git',
      url: `${fixtureRepository.url}/`,
    },
    {
      type: 'github',
      url: fixtureRepository.url,
    },
  ]) {
    const violation = validateFixtureDependency('@fixture/example', '1.0.0', {
      getPackageManifest: () => manifest('@fixture/example', repository),
    });
    assert.equal(
      violation.problem,
      'Resolved package repository metadata is not canonical.',
    );
  }
});

test('reports string repository metadata in diagnostics', () => {
  const violation = validateFixtureDependency('@fixture/example', '1.0.0', {
    getPackageManifest: () =>
      manifest('@fixture/example', fixtureRepository.url),
  });

  assert.equal(violation.actualSource, fixtureRepository.url);
});

test('ignores out-of-range versions when selecting SemVer range endpoints', () => {
  const violation = validateFixtureDependency('@fixture/example', '^1.0.0', {
    getPackageManifest: () => [
      manifest('@fixture/example', fixtureRepository, '1.0.10'),
      manifest(
        '@fixture/example',
        {
          type: 'git',
          url: 'git+https://other.example.invalid/other-examples.git',
        },
        '2.0.0',
      ),
      manifest('@fixture/example', fixtureRepository, '1.0.0'),
    ],
  });

  assert.equal(violation, undefined);
});

test('rejects a non-canonical SemVer range endpoint', () => {
  const violation = validateFixtureDependency('@fixture/example', '^1.0.0', {
    getPackageManifest: () => [
      manifest('@fixture/example', fixtureRepository, '1.0.10'),
      manifest(
        '@fixture/example',
        {
          type: 'git',
          url: 'git+https://other.example.invalid/other-examples.git',
        },
        '1.0.0',
      ),
    ],
  });

  assert.equal(
    violation.actualSource,
    'git git+https://other.example.invalid/other-examples.git',
  );
});

test('rejects an empty range result', () => {
  const violation = validateFixtureDependency('@fixture/example', '^1.0.0', {
    getPackageManifest: () => [],
  });

  assert.equal(
    violation.problem,
    'Could not resolve a published package manifest.',
  );
});

test('rejects npm aliases before querying the registry', () => {
  let registryQueried = false;
  const violation = validateFixtureDependency(
    '@fixture/native-texture',
    'npm:@other-fixture/native-texture@0.0.1',
    {
      getPackageManifest() {
        registryQueried = true;
      },
    },
  );

  assert.equal(registryQueried, false);
  assert.equal(violation.specType, 'alias');
  assert.match(violation.problem, /Only direct registry versions and ranges/);
});

test('rejects direct tarballs, Git, and local specs before querying npm', () => {
  const cases = [
    ['https://example.invalid/releases/download/v1/package.tgz', 'remote'],
    ['git+https://example.invalid/fixture-examples.git', 'git'],
    ['file:../fixture-examples/package.tgz', 'file'],
    ['file:../fixture-examples', 'directory'],
  ];

  for (const [spec, expectedType] of cases) {
    const violation = validateFixtureDependency('@fixture/example', spec, {
      getPackageManifest() {
        assert.fail('unsupported specs must not be queried');
      },
    });
    assert.equal(violation.specType, expectedType);
    assert.match(violation.problem, /Unsupported dependency spec type/);
  }
});

test('reports npm view failures without stopping other checks', () => {
  const violations = validateAggregator(
    {
      dependencies: {
        '@fixture/broken': '1.0.0',
        '@fixture/valid': '1.0.0',
      },
    },
    {
      aggregator: fixtureAggregator,
      getPackageManifest(packageSpec) {
        if (packageSpec.startsWith('@fixture/broken@')) {
          throw new Error('npm view failed');
        }
        return manifest('@fixture/valid');
      },
    },
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].dependency, '@fixture/broken');
  assert.match(violations[0].problem, /npm view failed/);
});

test('formats diagnostics with dependency and canonical metadata context', () => {
  const violation = validateFixtureDependency(
    '@fixture/native-texture',
    '0.0.1',
    {
      getPackageManifest: () =>
        manifest('@other-fixture/native-texture', {
          type: 'git',
          url: 'git+https://other.example.invalid/other-examples.git',
        }),
    },
  );
  const output = formatViolations([violation]);

  for (const expected of [
    'Invalid example package provenance:',
    'Aggregator: fixtures/package.json',
    'Dependency: @fixture/native-texture',
    'Resolved package: @other-fixture/native-texture',
    'Actual source: git git+https://other.example.invalid/other-examples.git',
    `Expected source: git ${fixtureRepository.url}`,
  ]) {
    assert.ok(output.includes(expected), `missing diagnostic: ${expected}`);
  }
});
