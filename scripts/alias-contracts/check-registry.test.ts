/**
 * Contract tests for the Gate 1 validator.
 *
 * A complete valid fixture exercises every record family. Focused tests clone
 * and mutate one property at a time, so each structural rule has a clear
 * failure signal. The final group exercises the packaged consumer CLI boundary
 * with temporary ESM modules.
 */
// cspell:ignore lynxai
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  aliases,
  ossResolverOverrides,
  ossSourceAreas,
  owners,
} from './registry.js';
import { runCli, validateAliasContracts } from './check-registry.js';

type MutableFixture = any;
type FixtureMutation = (fixture: MutableFixture) => void;

// Keep this fixture independent from the checked-in registry: it demonstrates
// the complete public schema without making production data its own oracle.
function completeRegistryFixture(): MutableFixture {
  return {
    owners: [
      { id: 'oss', description: 'OSS source' },
      { id: 'consumer', description: 'Consumer source' },
    ],
    aliases: [
      {
        id: 'portable-components',
        specifier: '@portable',
        owner: 'oss',
        visibility: 'public',
        kind: 'bare-and-subpaths',
        allowedImporters: ['oss', 'consumer'],
        supportsBare: true,
        publicSubpaths: [
          { path: 'Widget', kind: 'module', owner: 'oss' },
          { path: 'guides', kind: 'namespace', owner: 'oss' },
        ],
        canonical: {
          omitIndex: true,
          omitSourceExtensions: true,
        },
        allowMultipleResolverRoots: false,
        sourceAreas: ['oss-components'],
        downstream: {
          implementation: 'required',
          mayExtendBare: true,
          subpathOwner: 'oss',
        },
        lifecycle: {
          state: 'stable',
          removalPolicy: 'breaking-change',
        },
      },
      {
        id: 'oss-private',
        specifier: '@',
        owner: 'oss',
        visibility: 'owner-private',
        kind: 'prefix-only',
        allowedImporters: ['oss'],
        supportsBare: false,
        publicSubpaths: [],
        canonical: {
          omitIndex: false,
          omitSourceExtensions: false,
        },
        allowMultipleResolverRoots: false,
        sourceAreas: ['oss-components'],
        downstream: {
          implementation: 'required',
          mayExtendBare: false,
          subpathOwner: 'oss',
        },
        lifecycle: {
          state: 'stable',
          removalPolicy: 'owner-controlled',
        },
      },
    ],
    sourceAreas: [
      {
        id: 'oss-components',
        root: 'src/components',
        owner: 'oss',
        role: 'authoritative',
      },
      {
        id: 'consumer-generated',
        root: 'generated/content',
        owner: 'consumer',
        role: 'generated',
        origins: [
          {
            repository: 'example/source',
            root: 'docs',
          },
        ],
      },
    ],
    resolverOverrides: [
      {
        id: 'framework-react-compatibility',
        specifier: '@framework/private/react',
        kind: 'package-compatibility',
        match: 'exact',
        reason: 'The framework requires a different React implementation.',
        parity: {
          runtime: 'override-required',
          typescript: 'not-applicable',
        },
        lifecycle: 'temporary',
        removalCondition: 'Remove after the framework supports this React.',
      },
    ],
  };
}

// Each rejection case begins from known-valid data and changes only the
// contract property named by the test.
function errorsFor(mutate: FixtureMutation): string[] {
  const fixture = completeRegistryFixture();
  mutate(fixture);
  return validateAliasContracts(fixture);
}

function assertInvalid(
  name: string,
  mutate: FixtureMutation,
  expected: string,
): void {
  test(name, () => {
    const errors = errorsFor(mutate);
    assert.ok(
      errors.some((error) => error.includes(expected)),
      `expected an error containing ${JSON.stringify(expected)}:\n${errors.join('\n')}`,
    );
  });
}

// First prove both the synthetic schema example and production registry pass.
test('accepts the complete valid registry fixture', () => {
  assert.deepEqual(validateAliasContracts(completeRegistryFixture()), []);
});

test('accepts the checked-in OSS registry', () => {
  assert.deepEqual(
    validateAliasContracts({
      owners,
      aliases,
      sourceAreas: ossSourceAreas,
      resolverOverrides: ossResolverOverrides,
    }),
    [],
  );
});

test('reports malformed alias records instead of throwing', () => {
  const fixture = completeRegistryFixture();
  fixture.aliases[0] = null;

  assert.ok(
    validateAliasContracts(fixture).some((error) =>
      error.includes('aliases[0] must declare a non-empty id'),
    ),
  );
});

// Focused rejection cases cover each rule required by Issue #1503.
assertInvalid(
  'rejects duplicate alias IDs',
  ({ aliases }) => {
    aliases.push({
      ...structuredClone(aliases[0]),
      specifier: '@another-portable',
    });
  },
  "duplicate alias or override id 'portable-components'",
);

assertInvalid(
  'rejects duplicate override IDs',
  ({ resolverOverrides }) => {
    resolverOverrides.push({
      ...structuredClone(resolverOverrides[0]),
      specifier: '@framework/private/other',
    });
  },
  "duplicate alias or override id 'framework-react-compatibility'",
);

assertInvalid(
  'rejects duplicate alias specifiers',
  ({ aliases }) => {
    aliases.push({
      ...structuredClone(aliases[0]),
      id: 'another-portable',
    });
  },
  "duplicate alias specifier '@portable'",
);

assertInvalid(
  'rejects duplicate public subpaths',
  ({ aliases }) => {
    aliases[0].publicSubpaths.push({
      path: 'Widget',
      kind: 'module',
      owner: 'oss',
    });
  },
  "duplicate public subpath '@portable/Widget'",
);

assertInvalid(
  'rejects duplicate override specifiers',
  ({ resolverOverrides }) => {
    resolverOverrides.push({
      ...structuredClone(resolverOverrides[0]),
      id: 'other-framework-compatibility',
    });
  },
  "duplicate override specifier '@framework/private/react'",
);

assertInvalid(
  'rejects overlap between a portable alias and resolver override',
  ({ resolverOverrides }) => {
    resolverOverrides[0].specifier = '@portable/Widget';
  },
  "specifier '@portable/Widget' overlaps a portable alias",
);

assertInvalid(
  'rejects unknown owners',
  ({ aliases }) => {
    aliases[0].owner = 'unknown';
  },
  "references unknown owner 'unknown'",
);

assertInvalid(
  'rejects unknown visibility values',
  ({ aliases }) => {
    aliases[0].visibility = 'internal';
  },
  "unknown visibility 'internal'",
);

assertInvalid(
  'rejects unknown alias kinds',
  ({ aliases }) => {
    aliases[0].kind = 'directory';
  },
  "unknown alias kind 'directory'",
);

for (const { kind, supportsBare, publicSubpaths, expected } of [
  {
    kind: 'exact',
    supportsBare: false,
    publicSubpaths: [],
    expected: "kind 'exact' requires supportsBare to be true",
  },
  {
    kind: 'bare-and-subpaths',
    supportsBare: false,
    expected: "kind 'bare-and-subpaths' requires supportsBare to be true",
  },
  {
    kind: 'subpaths-only',
    supportsBare: true,
    expected: "kind 'subpaths-only' requires supportsBare to be false",
  },
  {
    kind: 'prefix-only',
    supportsBare: true,
    publicSubpaths: [],
    expected: "kind 'prefix-only' requires supportsBare to be false",
  },
]) {
  assertInvalid(
    `rejects ${kind} aliases with inconsistent supportsBare`,
    ({ aliases }) => {
      aliases[0].kind = kind;
      aliases[0].supportsBare = supportsBare;
      if (publicSubpaths) {
        aliases[0].publicSubpaths = publicSubpaths;
      }
    },
    expected,
  );
}

assertInvalid(
  'rejects prefix-only aliases that declare public subpaths',
  ({ aliases }) => {
    aliases[1].publicSubpaths.push({
      path: 'internal',
      kind: 'module',
      owner: 'oss',
    });
  },
  'is prefix-only and must not declare public subpaths',
);

assertInvalid(
  'rejects unknown downstream implementation policies',
  ({ aliases }) => {
    aliases[0].downstream.implementation = 'inherited';
  },
  "has unknown downstream implementation policy 'inherited'",
);

assertInvalid(
  'rejects non-boolean downstream bare-entry extension policies',
  ({ aliases }) => {
    aliases[0].downstream.mayExtendBare = 'yes';
  },
  'downstream mayExtendBare must be a boolean',
);

for (const [description, specifier] of [
  ['resolver exact-match suffixes', '@portable$'],
  ['wildcards', '@portable/*'],
  ['trailing slashes', '@portable/'],
  ['backslashes', '@portable\\Widget'],
  ['dot segments', '@portable/./Widget'],
]) {
  assertInvalid(
    `rejects alias specifiers containing ${description}`,
    ({ aliases }) => {
      aliases[0].specifier = specifier;
    },
    'must be a normalized import specifier without resolver syntax',
  );
}

for (const [description, specifier, expected] of [
  ['a trailing index', '@portable/index', 'uses non-canonical trailing /index'],
  [
    'a JavaScript or TypeScript source extension',
    '@portable.ts',
    'uses a non-canonical JavaScript/TypeScript source extension',
  ],
] as const) {
  assertInvalid(
    `rejects non-private alias specifiers using ${description}`,
    ({ aliases }) => {
      aliases[0].specifier = specifier;
    },
    expected,
  );
}

assertInvalid(
  'rejects unknown override kinds',
  ({ resolverOverrides }) => {
    resolverOverrides[0].kind = 'temporary-hack';
  },
  "unknown override kind 'temporary-hack'",
);

assertInvalid(
  'rejects unknown source roles',
  ({ sourceAreas }) => {
    sourceAreas[0].role = 'copied';
  },
  "unknown source role 'copied'",
);

assertInvalid(
  'rejects exact aliases that declare subpaths',
  ({ aliases }) => {
    aliases[0].kind = 'exact';
  },
  'is exact and must not declare public subpaths',
);

assertInvalid(
  'rejects private aliases without explicit importer owners',
  ({ aliases }) => {
    aliases[1].allowedImporters = [];
  },
  'is private and must declare explicit importer owners',
);

assertInvalid(
  'rejects public subpaths ending in index',
  ({ aliases }) => {
    aliases[0].publicSubpaths[0].path = 'Widget/index';
  },
  'uses non-canonical trailing /index',
);

assertInvalid(
  'rejects public subpaths with JavaScript or TypeScript source extensions',
  ({ aliases }) => {
    aliases[0].publicSubpaths[0].path = 'Widget.tsx';
  },
  'uses a non-canonical JavaScript/TypeScript source extension',
);

assertInvalid(
  'rejects public subpaths containing dot segments',
  ({ aliases }) => {
    aliases[0].publicSubpaths[0].path = 'guides/./Widget';
  },
  'must be a normalized relative subpath',
);

assertInvalid(
  'rejects public subpaths containing backslashes',
  ({ aliases }) => {
    aliases[0].publicSubpaths[0].path = 'guides\\Widget';
  },
  'must be a normalized relative subpath',
);

for (const [description, subpath] of [
  ['wildcards', 'guides/*'],
  ['resolver exact-match suffixes', 'guides$'],
  ['whitespace', 'guides /Widget'],
]) {
  assertInvalid(
    `rejects public subpaths containing ${description}`,
    ({ aliases }) => {
      aliases[0].publicSubpaths[0].path = subpath;
    },
    'must be a normalized relative subpath',
  );
}

assertInvalid(
  'rejects absolute source roots',
  ({ sourceAreas }) => {
    sourceAreas[0].root = '/workspace/src';
  },
  'must be repository-relative, not absolute',
);

assertInvalid(
  'rejects wildcard source roots',
  ({ sourceAreas }) => {
    sourceAreas[0].root = 'src/*';
  },
  'must be a normalized repository-relative path',
);

assertInvalid(
  'rejects ambiguously overlapping source roots',
  ({ sourceAreas }) => {
    sourceAreas.push({
      id: 'nested-components',
      root: 'src/components/internal',
      owner: 'oss',
      role: 'authoritative',
    });
  },
  "source roots 'src/components' and 'src/components/internal' overlap ambiguously",
);

assertInvalid(
  'rejects mounted roots without origins',
  ({ sourceAreas }) => {
    sourceAreas[0].role = 'mounted';
  },
  "with role 'mounted' must declare a non-empty origins array",
);

assertInvalid(
  'rejects generated roots with an empty origins array',
  ({ sourceAreas }) => {
    sourceAreas[1].origins = [];
  },
  "with role 'generated' must declare a non-empty origins array",
);

assertInvalid(
  'rejects malformed source origins',
  ({ sourceAreas }) => {
    sourceAreas[1].origins.push({
      repository: 'example/overlay',
      root: '',
    });
  },
  'origins[1] must declare origin.repository and origin.root',
);

assertInvalid(
  'rejects authoritative roots with origins',
  ({ sourceAreas }) => {
    sourceAreas[0].origins = [
      {
        repository: 'example/source',
        root: 'src/components',
      },
    ];
  },
  "with role 'authoritative' must not declare origins",
);

assertInvalid(
  'rejects the deprecated singular origin field',
  ({ sourceAreas }) => {
    sourceAreas[1].origin = sourceAreas[1].origins[0];
  },
  'must use the origins array instead of singular origin',
);

test('accepts generated roots with multiple origins', () => {
  const fixture = completeRegistryFixture();
  const generatedArea = fixture.sourceAreas[1];
  generatedArea.origins.push({
    repository: 'example/overlay',
    root: 'docs',
  });

  assert.deepEqual(validateAliasContracts(fixture), []);
});

for (const flag of ['omitIndex', 'omitSourceExtensions']) {
  assertInvalid(
    `rejects non-private aliases with canonical.${flag} disabled`,
    ({ aliases }) => {
      aliases[0].canonical[flag] = false;
    },
    'non-private aliases must enable both canonical spelling rules',
  );
}

function exactAlias(id: string, specifier: string): MutableFixture {
  const alias = structuredClone(completeRegistryFixture().aliases[0]);
  alias.id = id;
  alias.specifier = specifier;
  alias.kind = 'exact';
  alias.publicSubpaths = [];
  alias.downstream.mayExtendBare = false;
  alias.downstream.subpathOwner = null;
  return alias;
}

assertInvalid(
  'rejects a descendant alias covered by an earlier public namespace',
  ({ aliases }) => {
    aliases.push(exactAlias('guide-widget', '@portable/guides/Widget'));
  },
  'overlap semantically',
);

assertInvalid(
  'rejects a public namespace covering an earlier descendant alias',
  ({ aliases }) => {
    aliases.unshift(exactAlias('guide-widget', '@portable/guides/Widget'));
  },
  'overlap semantically',
);

assertInvalid(
  'rejects aliases beneath a prefix-only namespace',
  ({ aliases }) => {
    aliases[1].specifier = '@private';
    aliases.push(exactAlias('private-tool', '@private/tool'));
  },
  'overlap semantically',
);

for (const [description, insertAt] of [
  ['namespace before descendant', 2],
  ['descendant before namespace', 1],
]) {
  assertInvalid(
    `rejects overlapping public subpaths with ${description}`,
    ({ aliases }) => {
      aliases[0].publicSubpaths.splice(insertAt, 0, {
        path: 'guides/Widget',
        kind: 'module',
        owner: 'oss',
      });
    },
    'public subpaths overlap semantically',
  );
}

assertInvalid(
  'rejects non-exact resolver overrides',
  ({ resolverOverrides }) => {
    resolverOverrides[0].match = 'prefix';
  },
  'must use exact matching',
);

for (const [description, specifier] of [
  ['resolver exact-match suffixes', '@framework/private/react$'],
  ['wildcards', '@framework/private/*'],
  ['trailing slashes', '@framework/private/react/'],
  ['backslashes', '@framework\\private\\react'],
  ['dot segments', '@framework/./private/react'],
]) {
  assertInvalid(
    `rejects exact resolver override specifiers containing ${description}`,
    ({ resolverOverrides }) => {
      resolverOverrides[0].specifier = specifier;
    },
    'must be a normalized exact import specifier without resolver syntax',
  );
}

assertInvalid(
  'rejects overrides missing a reason',
  ({ resolverOverrides }) => {
    resolverOverrides[0].reason = '';
  },
  'must declare a reason',
);

assertInvalid(
  'rejects overrides missing parity expectations',
  ({ resolverOverrides }) => {
    delete resolverOverrides[0].parity;
  },
  'must declare valid runtime and TypeScript parity expectations',
);

assertInvalid(
  'rejects overrides missing a lifecycle state',
  ({ resolverOverrides }) => {
    resolverOverrides[0].lifecycle = '';
  },
  'must declare a lifecycle state',
);

assertInvalid(
  'rejects overrides missing a removal condition',
  ({ resolverOverrides }) => {
    resolverOverrides[0].removalCondition = '';
  },
  'must declare a removal condition',
);

assertInvalid(
  'rejects unsupported resolver override parity vocabulary',
  ({ resolverOverrides }) => {
    resolverOverrides[0].parity.typescript = 'required';
  },
  'must declare valid runtime and TypeScript parity expectations',
);

assertInvalid(
  'rejects an undeclared incomplete override',
  ({ resolverOverrides }) => {
    resolverOverrides.push({
      id: 'future-override',
      specifier: '@future/private/module',
    });
  },
  "resolver override 'future-override' has unknown override kind",
);

// Consumer modules may replace repository-local physical data, but they must
// preserve the OSS-owned owner and alias policy imported by the CLI.
test('accepts consumer-owned source-map and resolver-override modules', async () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-valid-'),
  );
  try {
    const sourceMap = path.join(tempDirectory, 'source-map.mjs');
    const overrides = path.join(tempDirectory, 'overrides.mjs');
    const consumerSourceAreas = [
      ...ossSourceAreas.map((area) => ({
        id: area.id,
        root: `mounted/${area.id}`,
        owner: area.owner,
        role: 'mounted',
        origins: [
          {
            repository: 'lynx-family/lynx-website',
            root: area.root,
          },
        ],
      })),
      {
        id: 'consumer-source',
        root: 'src/consumer',
        owner: 'consumer',
        role: 'authoritative',
      },
    ];
    writeFileSync(
      sourceMap,
      `export const sourceAreas = ${JSON.stringify(consumerSourceAreas)};\n`,
    );
    writeFileSync(
      overrides,
      `export const resolverOverrides = ${JSON.stringify([
        {
          id: 'consumer-package-compatibility',
          specifier: '@consumer/private/runtime',
          kind: 'package-compatibility',
          match: 'exact',
          reason: 'The consumer requires a runtime package compatibility shim.',
          parity: {
            runtime: 'override-required',
            typescript: 'not-applicable',
          },
          lifecycle: 'temporary',
          removalCondition:
            'Remove after the consumer upgrades the affected runtime package.',
        },
      ])};\n`,
    );
    assert.equal(
      await runCli(
        ['--source-map', sourceMap, '--resolver-overrides', overrides],
        tempDirectory,
      ),
      0,
    );
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('a source-map-only consumer does not inherit OSS overrides', async () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-source-map-only-'),
  );
  const originalConsoleError = console.error;
  const defaults = {
    owners,
    aliases,
    sourceAreas: ossSourceAreas,
    resolverOverrides: [
      ...ossResolverOverrides,
      {
        id: 'test-portable-alias-overlap',
        specifier: '@lynx',
        kind: 'package-compatibility',
        match: 'exact',
        reason: 'A test-only invalid OSS override.',
        parity: {
          runtime: 'override-required',
          typescript: 'not-applicable',
        },
        lifecycle: 'temporary',
        removalCondition: 'Remove with this test fixture.',
      },
    ],
  };
  try {
    const sourceMap = path.join(tempDirectory, 'source-map.mjs');
    writeFileSync(
      sourceMap,
      `export const sourceAreas = ${JSON.stringify(ossSourceAreas)};\n`,
    );
    console.error = () => {};
    assert.equal(
      await runCli(['--source-map', sourceMap], tempDirectory, defaults),
      0,
    );
  } finally {
    console.error = originalConsoleError;
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('consumer modules cannot redefine OSS alias policy', async () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-policy-'),
  );
  const originalConsoleError = console.error;
  try {
    const sourceMap = path.join(tempDirectory, 'source-map.mjs');
    writeFileSync(
      sourceMap,
      [
        'export const aliases = [];',
        `export const sourceAreas = ${JSON.stringify(ossSourceAreas)};`,
        '',
      ].join('\n'),
    );
    console.error = () => {};
    assert.equal(await runCli(['--source-map', sourceMap], tempDirectory), 1);
  } finally {
    console.error = originalConsoleError;
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('consumer source maps must retain every OSS source-area ID', async () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-complete-map-'),
  );
  const originalConsoleError = console.error;
  const errors: string[] = [];
  try {
    const sourceMap = path.join(tempDirectory, 'source-map.mjs');
    const sourceAreas = ossSourceAreas.filter(
      ({ id }) => id !== 'oss-version-data',
    );
    writeFileSync(
      sourceMap,
      `export const sourceAreas = ${JSON.stringify(sourceAreas)};\n`,
    );
    console.error = (...args) => errors.push(args.join(' '));
    assert.equal(await runCli(['--source-map', sourceMap], tempDirectory), 1);
    assert.match(
      errors.join('\n'),
      /missing required OSS source area 'oss-version-data'/,
    );
  } finally {
    console.error = originalConsoleError;
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('consumer source maps cannot change a shared source-area owner', async () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-owner-'),
  );
  const originalConsoleError = console.error;
  try {
    const sourceMap = path.join(tempDirectory, 'source-map.mjs');
    const sourceAreas: MutableFixture = structuredClone(ossSourceAreas);
    sourceAreas.find(
      (area: MutableFixture) => area.id === 'oss-components',
    ).owner = 'consumer';
    writeFileSync(
      sourceMap,
      `export const sourceAreas = ${JSON.stringify(sourceAreas)};\n`,
    );
    console.error = () => {};
    assert.equal(await runCli(['--source-map', sourceMap], tempDirectory), 1);
  } finally {
    console.error = originalConsoleError;
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('additional consumer source areas must remain consumer-owned', async () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-extra-owner-'),
  );
  const originalConsoleError = console.error;
  try {
    const sourceMap = path.join(tempDirectory, 'source-map.mjs');
    const sourceAreas = [
      ...structuredClone(ossSourceAreas),
      {
        id: 'downstream-private-source',
        root: 'downstream/src',
        owner: 'lynx-website',
        role: 'authoritative',
      },
    ];
    writeFileSync(
      sourceMap,
      `export const sourceAreas = ${JSON.stringify(sourceAreas)};\n`,
    );
    console.error = () => {};
    assert.equal(await runCli(['--source-map', sourceMap], tempDirectory), 1);
  } finally {
    console.error = originalConsoleError;
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('an override module must explicitly declare its local overrides', async () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-undeclared-'),
  );
  const originalConsoleError = console.error;
  try {
    const overrides = path.join(tempDirectory, 'overrides.mjs');
    writeFileSync(overrides, 'export const unrelated = [];\n');
    console.error = () => {};
    assert.equal(
      await runCli(['--resolver-overrides', overrides], tempDirectory),
      1,
    );
  } finally {
    console.error = originalConsoleError;
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('executes the checker when its entry path is a symlink', () => {
  const tempDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'alias-contracts-symlink-'),
  );
  try {
    const linkedPackage = path.join(
      tempDirectory,
      'node_modules',
      '@lynx-js',
      'lynx-doc',
    );
    mkdirSync(path.dirname(linkedPackage), { recursive: true });
    symlinkSync(
      fileURLToPath(new URL('../..', import.meta.url)),
      linkedPackage,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const linkedChecker = path.join(
      linkedPackage,
      'scripts',
      'alias-contracts',
      'check-registry.ts',
    );

    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', linkedChecker, '--unknown'],
      { encoding: 'utf8' },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown argument '--unknown'/);
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});
