import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatViolations,
  validateAggregator,
  validateDependency,
} from './check-example-package-provenance.mjs';

const canonicalRepository = {
  type: 'git',
  url: 'git+https://github.com/lynx-family/lynx-examples.git',
};

function manifest(name, repository, version = '1.0.0') {
  return {
    name,
    version,
    repository: arguments.length === 1 ? canonicalRepository : repository,
  };
}

test('accepts canonical lynx-examples repository metadata', () => {
  let packageSpec;
  const violation = validateDependency('@lynx-example/view', '^0.6.5', {
    getPackageManifest(spec) {
      packageSpec = spec;
      return manifest(
        '@lynx-example/view',
        {
          ...canonicalRepository,
          directory: 'examples/view',
        },
        '0.6.5',
      );
    },
  });

  assert.equal(violation, undefined);
  assert.equal(packageSpec, '@lynx-example/view@^0.6.5');
});

test('requires the resolved package name to use the expected scope', () => {
  const violation = validateDependency('@lynx-example/view', '0.6.5', {
    getPackageManifest: () => manifest('@other-scope/view'),
  });

  assert.equal(violation.resolvedPackage, '@other-scope/view');
  assert.equal(
    violation.problem,
    'Resolved package name must use the @lynx-example/ namespace.',
  );
});

test('requires the canonical repository type and URL', () => {
  for (const repository of [
    undefined,
    'git+https://github.com/lynx-family/lynx-examples.git',
    { type: 'git', url: 'https://github.com/lynx-family/lynx-examples.git' },
    {
      type: 'git',
      url: 'git+https://github.com/lynx-family/lynx-examples.git/',
    },
    {
      type: 'github',
      url: 'git+https://github.com/lynx-family/lynx-examples.git',
    },
  ]) {
    const violation = validateDependency('@lynx-example/example', '1.0.0', {
      getPackageManifest: () => manifest('@lynx-example/example', repository),
    });
    assert.equal(
      violation.problem,
      'Resolved package repository metadata is not canonical.',
    );
  }
});

test('reports string repository metadata in diagnostics', () => {
  const violation = validateDependency('@lynx-example/example', '1.0.0', {
    getPackageManifest: () =>
      manifest(
        '@lynx-example/example',
        'git+https://github.com/lynx-family/lynx-examples.git',
      ),
  });

  assert.equal(
    violation.actualSource,
    'git+https://github.com/lynx-family/lynx-examples.git',
  );
});

test('ignores out-of-range versions when selecting SemVer range endpoints', () => {
  const violation = validateDependency('@lynx-example/example', '^1.0.0', {
    getPackageManifest: () => [
      manifest('@lynx-example/example', canonicalRepository, '1.0.10'),
      manifest(
        '@lynx-example/example',
        {
          type: 'git',
          url: 'git+https://github.com/lynx-family/lynx-ui.git',
        },
        '2.0.0',
      ),
      manifest('@lynx-example/example', canonicalRepository, '1.0.0'),
    ],
  });

  assert.equal(violation, undefined);
});

test('rejects a non-canonical SemVer range endpoint', () => {
  const violation = validateDependency('@lynx-example/example', '^1.0.0', {
    getPackageManifest: () => [
      manifest('@lynx-example/example', canonicalRepository, '1.0.10'),
      manifest(
        '@lynx-example/example',
        {
          type: 'git',
          url: 'git+https://github.com/lynx-family/lynx-ui.git',
        },
        '1.0.0',
      ),
    ],
  });

  assert.equal(
    violation.actualSource,
    'git git+https://github.com/lynx-family/lynx-ui.git',
  );
});

test('rejects an empty range result', () => {
  const violation = validateDependency('@lynx-example/example', '^1.0.0', {
    getPackageManifest: () => [],
  });

  assert.equal(
    violation.problem,
    'Could not resolve a published package manifest.',
  );
});

test('rejects npm aliases before querying the registry', () => {
  let registryQueried = false;
  const violation = validateDependency(
    '@lynx-example/lynxtron-native-texture',
    'npm:@lynxtron-examples/native-texture-canvas@0.0.1',
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
    [
      'https://github.com/example/repo/releases/download/v1/package.tgz',
      'remote',
    ],
    ['github:lynx-family/lynx-examples', 'git'],
    ['file:../lynx-examples/package.tgz', 'file'],
    ['file:../lynx-examples', 'directory'],
  ];

  for (const [spec, expectedType] of cases) {
    const violation = validateDependency('@lynx-example/example', spec, {
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
        '@lynx-example/broken': '1.0.0',
        '@lynx-example/valid': '1.0.0',
      },
    },
    {
      getPackageManifest(packageSpec) {
        if (packageSpec.startsWith('@lynx-example/broken@')) {
          throw new Error('npm view failed');
        }
        return manifest('@lynx-example/valid');
      },
    },
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].dependency, '@lynx-example/broken');
  assert.match(violations[0].problem, /npm view failed/);
});

test('formats diagnostics with dependency and canonical metadata context', () => {
  const violation = validateDependency(
    '@lynx-example/lynxtron-native-texture',
    '0.0.1',
    {
      getPackageManifest: () =>
        manifest('@lynxtron-examples/native-texture-canvas', {
          type: 'git',
          url: 'git+https://github.com/lynx-community/lynxtron-examples.git',
        }),
    },
  );
  const output = formatViolations([violation]);

  for (const expected of [
    'Invalid example package provenance:',
    'Aggregator: packages/lynx-example-packages/package.json',
    'Dependency: @lynx-example/lynxtron-native-texture',
    'Resolved package: @lynxtron-examples/native-texture-canvas',
    'Actual source: git git+https://github.com/lynx-community/lynxtron-examples.git',
    'Expected source: git git+https://github.com/lynx-family/lynx-examples.git',
  ]) {
    assert.ok(output.includes(expected), `missing diagnostic: ${expected}`);
  }
});
