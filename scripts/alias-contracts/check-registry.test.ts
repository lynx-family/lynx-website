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
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  aliases,
  ossResolverOverrides,
  ossSourceAreas,
  owners,
} from './registry.js';
import { runCli, validateAliasContracts } from './check-registry.js';
import type {
  AliasContract,
  ConsumerAliasExtension,
  SourceArea,
} from './types.js';

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
        bareTargetOwners: ['oss', 'consumer'],
        subpaths: {
          targetOwners: ['oss'],
          lifecycle: {
            state: 'migration',
            removalCondition: 'migrate-to-bare-entry',
          },
        },
        canonical: {
          omitIndex: true,
          omitSourceExtensions: true,
        },
        allowMultipleResolverRoots: false,
        implementationSources: {
          requiredAreas: ['oss-components'],
          additionalOwners: ['consumer'],
        },
        downstream: {
          implementation: 'required',
          mayExtendBare: true,
        },
        lifecycle: {
          state: 'stable',
          changePolicy: 'breaking-change',
        },
      },
      {
        id: 'oss-private',
        specifier: '@',
        owner: 'oss',
        visibility: 'owner-private',
        kind: 'subpaths-only',
        allowedImporters: ['oss'],
        subpaths: {
          targetOwners: ['oss'],
          lifecycle: {
            state: 'stable',
            changePolicy: 'owner-controlled',
          },
        },
        canonical: {
          omitIndex: false,
          omitSourceExtensions: false,
        },
        allowMultipleResolverRoots: false,
        implementationSources: {
          requiredAreas: ['oss-components'],
          additionalOwners: [],
        },
        downstream: {
          implementation: 'required',
        },
        lifecycle: {
          state: 'stable',
          changePolicy: 'owner-controlled',
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

// These assert supported consumer contracts against actual registry policy.
// Gate 2 will exercise resolution; Gate 1 does not resolve fixture paths.
test('permits a consumer custom theme alongside mounted OSS and framework themes', () => {
  const theme = (aliases as readonly AliasContract[]).find(
    ({ specifier }) => specifier === '@theme',
  );
  assert.ok(theme?.kind === 'bare-and-subpaths');
  const consumerTheme: SourceArea = {
    id: 'consumer-theme',
    root: 'theme',
    owner: 'consumer',
    role: 'authoritative',
  };
  const sourceAreas = [
    ...ossSourceAreas.map((area) => ({
      ...area,
      root: `mounted/website/${area.root}`,
    })),
    consumerTheme,
  ];
  assert.deepEqual(
    validateAliasContracts({
      owners,
      aliases,
      sourceAreas,
      sourceAreaPolicy: ossSourceAreas,
      resolverOverrides: [],
    }),
    [],
  );
  assert.ok(theme.bareTargetOwners.includes(consumerTheme.owner));
  assert.ok(theme.subpaths.targetOwners.includes(consumerTheme.owner));
  assert.ok(
    theme.implementationSources.additionalOwners.includes(consumerTheme.owner),
  );
  // Keep the existing implementations available without relabeling them.
  assert.ok(theme.bareTargetOwners.includes('lynx-website'));
  assert.ok(theme.subpaths.targetOwners.includes('rspress'));
  assert.equal(theme.allowMultipleResolverRoots, true);
});

test('permits the downstream private alias root list without granting cross-owner access', () => {
  const binding = { specifier: '@', roots: ['src', 'src/lynx-ui', 'src/oss'] };
  const policy = (aliases as readonly AliasContract[]).find(
    ({ specifier }) => specifier === binding.specifier,
  );
  assert.ok(policy?.kind === 'subpaths-only');
  assert.ok(binding.roots.length <= 1 || policy.allowMultipleResolverRoots);
  assert.equal(policy.visibility, 'owner-private');
  assert.deepEqual(policy.allowedImporters, ['lynx-website']);
  assert.deepEqual(policy.subpaths.targetOwners, ['lynx-website']);
  assert.deepEqual(policy.implementationSources.additionalOwners, []);
});

for (const [label, description] of [
  ['missing', undefined],
  ['empty', ''],
  ['whitespace-only', ' \t\n'],
  ['numeric', 42],
  ['null', null],
] as const) {
  assertInvalid(
    `rejects owners with ${label} descriptions`,
    ({ owners }) => {
      if (description === undefined) {
        delete owners[0].description;
      } else {
        owners[0].description = description;
      }
    },
    'owners[0] must declare a non-empty description',
  );
}

test('reports malformed alias records instead of throwing', () => {
  const fixture = completeRegistryFixture();
  fixture.aliases[0] = null;

  assert.ok(
    validateAliasContracts(fixture).some((error) =>
      error.includes('aliases[0] must declare a non-empty id'),
    ),
  );
});

test('malformed fields produce diagnostics without string coercion', () => {
  for (const [collection, field] of [
    ['sourceAreas', 'owner'],
    ['sourceAreas', 'root'],
    ['sourceAreas', 'role'],
    ['aliases', 'owner'],
    ['aliases', 'kind'],
    ['resolverOverrides', 'kind'],
  ]) {
    const fixture = completeRegistryFixture();
    fixture[collection!][0][field!] = { toString: null };
    assert.ok(validateAliasContracts(fixture).length > 0);
  }
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
  "specifier '@portable/Widget' overlaps a declared alias",
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

assertInvalid(
  'rejects exact aliases that declare subpath policy',
  ({ aliases }) => {
    aliases[0].kind = 'exact';
  },
  'is exact and must not declare subpath policy',
);

assertInvalid(
  'rejects subpath aliases without subpath policy',
  ({ aliases }) => {
    delete aliases[0].subpaths;
  },
  'must declare subpath policy',
);

assertInvalid(
  'rejects empty direct-subpath target owner sets',
  ({ aliases }) => {
    aliases[0].subpaths.targetOwners = [];
  },
  'subpath targetOwners must be a non-empty array',
);

assertInvalid(
  'rejects unknown direct-subpath target owners',
  ({ aliases }) => {
    aliases[0].subpaths.targetOwners = ['unknown'];
  },
  "subpath targetOwners references unknown owner 'unknown'",
);

assertInvalid(
  'rejects duplicate direct-subpath target owners',
  ({ aliases }) => {
    aliases[0].subpaths.targetOwners = ['oss', 'oss'];
  },
  "subpath targetOwners contains duplicate owner 'oss'",
);

assertInvalid(
  'rejects bare aliases without target owners',
  ({ aliases }) => {
    delete aliases[0].bareTargetOwners;
  },
  'bareTargetOwners must be a non-empty array',
);

assertInvalid(
  'rejects unknown bare target owners',
  ({ aliases }) => {
    aliases[0].bareTargetOwners = ['unknown'];
  },
  "bareTargetOwners references unknown owner 'unknown'",
);

assertInvalid(
  'rejects duplicate bare target owners',
  ({ aliases }) => {
    aliases[0].bareTargetOwners = ['oss', 'oss'];
  },
  "bareTargetOwners contains duplicate owner 'oss'",
);

assertInvalid(
  'rejects implementation source owners outside target owner policy',
  ({ aliases }) => {
    aliases[0].bareTargetOwners = ['consumer'];
    aliases[0].subpaths.targetOwners = ['consumer'];
  },
  "required source area 'oss-components' has owner 'oss' outside its target owner policy",
);

assertInvalid(
  'rejects aliases without implementation source policy',
  ({ aliases }) => {
    delete aliases[0].implementationSources;
  },
  'must declare implementationSources',
);

assertInvalid(
  'rejects non-array required source areas',
  ({ aliases }) => {
    aliases[0].implementationSources.requiredAreas = 'oss-components';
  },
  'implementationSources.requiredAreas must be an array',
);

assertInvalid(
  'rejects unknown required source areas',
  ({ aliases }) => {
    aliases[0].implementationSources.requiredAreas = ['unknown'];
  },
  "references unknown required source area 'unknown'",
);

assertInvalid(
  'rejects duplicate required source areas',
  ({ aliases }) => {
    aliases[0].implementationSources.requiredAreas = [
      'oss-components',
      'oss-components',
    ];
  },
  "contains duplicate required source area 'oss-components'",
);

assertInvalid(
  'rejects non-array additional source owners',
  ({ aliases }) => {
    aliases[0].implementationSources.additionalOwners = 'consumer';
  },
  'implementationSources.additionalOwners must be an array',
);

assertInvalid(
  'rejects unknown additional source owners',
  ({ aliases }) => {
    aliases[0].implementationSources.additionalOwners = ['unknown'];
  },
  "references unknown additional source owner 'unknown'",
);

assertInvalid(
  'rejects duplicate additional source owners',
  ({ aliases }) => {
    aliases[0].implementationSources.additionalOwners = [
      'consumer',
      'consumer',
    ];
  },
  "contains duplicate additional source owner 'consumer'",
);

assertInvalid(
  'rejects additional source owners outside target owner policy',
  ({ aliases }) => {
    aliases[0].bareTargetOwners = ['oss'];
  },
  "additional source owner 'consumer' is outside its target owner policy",
);

assertInvalid(
  'rejects bare target owners on aliases without bare entries',
  ({ aliases }) => {
    aliases[1].bareTargetOwners = ['oss'];
  },
  'has no bare entry and must not declare bareTargetOwners',
);

assertInvalid(
  'rejects incomplete subpath lifecycle policy',
  ({ aliases }) => {
    aliases[0].subpaths.lifecycle.removalCondition = '';
  },
  'subpaths migration lifecycle must declare a removal condition',
);

assertInvalid(
  'rejects unknown alias lifecycle states',
  ({ aliases }) => {
    aliases[0].lifecycle.state = 'deprecated';
  },
  "has unknown lifecycle state 'deprecated'",
);

assertInvalid(
  'rejects unknown stable change policies',
  ({ aliases }) => {
    aliases[0].lifecycle.changePolicy = 'maintainer-discretion';
  },
  "stable lifecycle has unknown change policy 'maintainer-discretion'",
);

assertInvalid(
  'rejects stable lifecycles without change policies',
  ({ aliases }) => {
    delete aliases[0].lifecycle.changePolicy;
  },
  'stable lifecycle must declare a change policy',
);

assertInvalid(
  'rejects stable lifecycles with removal conditions',
  ({ aliases }) => {
    aliases[0].lifecycle.removalCondition = 'remove-next-release';
  },
  'stable lifecycle must not declare a removal condition',
);

assertInvalid(
  'rejects migration lifecycles with change policies',
  ({ aliases }) => {
    aliases[0].subpaths.lifecycle.changePolicy = 'breaking-change';
  },
  'subpaths migration lifecycle must not declare a change policy',
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

assertInvalid(
  'rejects bare aliases without bare-entry extension policies',
  ({ aliases }) => {
    delete aliases[0].downstream.mayExtendBare;
  },
  'downstream mayExtendBare must be a boolean',
);

assertInvalid(
  'rejects extensible bare entries without consumer target ownership',
  ({ aliases }) => {
    aliases[0].bareTargetOwners = ['oss'];
  },
  "permits bare extension and must allow 'consumer' as a bare target owner",
);

assertInvalid(
  'rejects extensible bare entries without consumer source ownership',
  ({ aliases }) => {
    aliases[0].implementationSources.additionalOwners = [];
  },
  "permits bare extension and must allow 'consumer' as an additional source owner",
);

assertInvalid(
  'rejects bare-entry extension policies on aliases without bare entries',
  ({ aliases }) => {
    aliases[1].downstream.mayExtendBare = false;
  },
  'has no bare entry and must not declare downstream mayExtendBare',
);

test('optional implementations may still permit bare-entry extensions', () => {
  const fixture = completeRegistryFixture();
  fixture.aliases[0].downstream.implementation = 'optional';

  assert.deepEqual(validateAliasContracts(fixture), []);
});

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
  'rejects private aliases without explicit importer owners',
  ({ aliases }) => {
    aliases[1].allowedImporters = [];
  },
  "is owner-private and may only be imported by owner 'oss'",
);

assertInvalid(
  'rejects foreign importers for owner-private aliases',
  ({ aliases }) => {
    aliases[1].allowedImporters = ['consumer'];
  },
  "is owner-private and may only be imported by owner 'oss'",
);

for (const kind of ['exact', 'bare-and-subpaths', 'subpaths-only'] as const) {
  const fixture = completeRegistryFixture();
  const alias = fixture.aliases[1];
  alias.kind = kind;
  alias.allowMultipleResolverRoots = true;
  if (kind === 'exact') {
    delete alias.subpaths;
  }
  if (kind !== 'subpaths-only') {
    alias.bareTargetOwners = ['oss'];
    alias.downstream.mayExtendBare = false;
  }

  test(`accepts owner-private ${kind} aliases with same-owner targets and multiple roots`, () => {
    assert.deepEqual(validateAliasContracts(fixture), []);
  });

  for (const form of ['bare', 'subpath'] as const) {
    if (
      (form === 'bare' && kind === 'subpaths-only') ||
      (form === 'subpath' && kind === 'exact')
    ) {
      continue;
    }
    test(`rejects foreign ${form} targets for owner-private ${kind} aliases even with additional source permission`, () => {
      const invalid = structuredClone(fixture);
      const privateAlias = invalid.aliases[1];
      const targetOwners =
        form === 'bare'
          ? privateAlias.bareTargetOwners
          : privateAlias.subpaths.targetOwners;
      targetOwners.push('consumer');
      // Keep source and target permissions consistent so their existing
      // cross-check cannot mask the missing owner-private restriction.
      privateAlias.implementationSources.additionalOwners = ['consumer'];

      const field =
        form === 'bare' ? 'bareTargetOwners' : 'subpath targetOwners';
      assert.deepEqual(validateAliasContracts(invalid), [
        `alias 'oss-private' is owner-private and ${field} may only contain owner 'oss'`,
      ]);
    });
  }
}

assertInvalid(
  'rejects absolute source roots',
  ({ sourceAreas }) => {
    sourceAreas[0].root = '/workspace/src';
  },
  'must be repository-relative, not absolute',
);

assertInvalid(
  'rejects Windows drive-relative source roots',
  ({ sourceAreas }) => {
    sourceAreas[0].root = 'C:src/components';
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
  'rejects absolute source origin roots',
  ({ sourceAreas }) => {
    sourceAreas[1].origins[0].root = '/tmp/checkout/docs';
  },
  "origins[0] root '/tmp/checkout/docs' must be repository-relative, not absolute",
);

assertInvalid(
  'rejects parent traversal in source origin roots',
  ({ sourceAreas }) => {
    sourceAreas[1].origins[0].root = '../outside/docs';
  },
  "origins[0] root '../outside/docs' must be a normalized repository-relative path",
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

test('accepts globs in source origin roots', () => {
  const fixture = completeRegistryFixture();
  fixture.sourceAreas[1].origins[0].root = 'packages/*/docs';

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
  delete alias.subpaths;
  alias.bareTargetOwners = ['oss'];
  alias.implementationSources.additionalOwners = [];
  alias.downstream.mayExtendBare = false;
  return alias;
}

test('namespace overlap follows alias shape, not alias order', () => {
  for (const parentKind of ['exact', 'bare-and-subpaths', 'subpaths-only']) {
    for (const childKind of ['exact', 'bare-and-subpaths', 'subpaths-only']) {
      for (const childName of ['@parent', '@parent/child', '@parent-other']) {
        const fixture = completeRegistryFixture();
        const makeAlias = (id: string, specifier: string, kind: string) => {
          const alias = exactAlias(id, specifier);
          alias.kind = kind;
          if (kind !== 'exact') {
            alias.subpaths = structuredClone(fixture.aliases[1].subpaths);
          }
          if (kind === 'subpaths-only') {
            delete alias.bareTargetOwners;
            delete alias.downstream.mayExtendBare;
          }
          return alias;
        };
        const parent = makeAlias('parent', '@parent', parentKind);
        const child = makeAlias('child', childName, childKind);
        // Prove each input is valid before checking the pair.
        for (const alias of [parent, child]) {
          assert.deepEqual(
            validateAliasContracts({ ...fixture, aliases: [alias] }),
            [],
          );
        }
        const conflict =
          childName === '@parent' ||
          (childName === '@parent/child' && parentKind !== 'exact');
        for (const pair of [
          [parent, child],
          [child, parent],
        ]) {
          const errors = validateAliasContracts({ ...fixture, aliases: pair });
          assert.equal(
            errors.length > 0,
            conflict,
            `${parentKind} / ${childKind} / ${childName}`,
          );
        }
      }
    }
  }
});

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
  'rejects aliases beneath an owner-private subpath namespace',
  ({ aliases }) => {
    aliases[1].specifier = '@private';
    aliases.push(exactAlias('private-tool', '@private/tool'));
  },
  'overlap semantically',
);

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

// Extensions use the shared schema with consumer-private ownership and
// explicitly bounded implementation areas.
function consumerAliasExtension(): ConsumerAliasExtension {
  return {
    id: 'consumer-private',
    specifier: '@local',
    owner: 'consumer',
    visibility: 'owner-private',
    kind: 'subpaths-only',
    allowedImporters: ['consumer'],
    subpaths: {
      targetOwners: ['consumer'],
      lifecycle: { state: 'stable', changePolicy: 'owner-controlled' },
    },
    canonical: { omitIndex: false, omitSourceExtensions: false },
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['consumer-generated'],
      additionalOwners: [],
    },
    downstream: { implementation: 'required' },
    lifecycle: { state: 'stable', changePolicy: 'owner-controlled' },
  };
}

function consumerExtensionFixture(): MutableFixture {
  return {
    ...completeRegistryFixture(),
    aliasExtensions: [consumerAliasExtension()],
  };
}

for (const kind of ['exact', 'bare-and-subpaths', 'subpaths-only'] as const) {
  test(`accepts a consumer-private ${kind} extension without mutating shared policy`, () => {
    const fixture = consumerExtensionFixture();
    const extension = fixture.aliasExtensions[0];
    extension.kind = kind;
    if (kind === 'exact') {
      delete extension.subpaths;
    }
    if (kind !== 'subpaths-only') {
      extension.bareTargetOwners = ['consumer'];
      extension.downstream.mayExtendBare = false;
    }
    extension.allowMultipleResolverRoots = true;
    fixture.sourceAreas.push({
      id: 'consumer-ui',
      owner: 'consumer',
      role: 'authoritative',
      root: 'src/ui',
    });
    extension.implementationSources.requiredAreas.push('consumer-ui');
    const before = structuredClone(fixture);
    assert.deepEqual(validateAliasContracts(fixture), []);
    assert.deepEqual(fixture, before);
  });
}

for (const [name, mutate, expected] of [
  [
    'foreign namespace ownership',
    (extension: MutableFixture) => {
      extension.owner = 'oss';
    },
    "alias extension 'consumer-private' must be owned by 'consumer'",
  ],
  [
    'public visibility',
    (extension: MutableFixture) => {
      extension.visibility = 'public';
      extension.canonical = { omitIndex: true, omitSourceExtensions: true };
    },
    "alias extension 'consumer-private' must be owner-private",
  ],
  [
    'foreign importers',
    (extension: MutableFixture) => {
      extension.allowedImporters.push('oss');
    },
    "may only be imported by owner 'consumer'",
  ],
  [
    'foreign direct targets',
    (extension: MutableFixture) => {
      extension.subpaths.targetOwners.push('oss');
    },
    "subpath targetOwners may only contain owner 'consumer'",
  ],
  [
    'foreign bare targets',
    (extension: MutableFixture) => {
      extension.kind = 'bare-and-subpaths';
      extension.bareTargetOwners = ['consumer', 'oss'];
      extension.downstream.mayExtendBare = false;
    },
    "bareTargetOwners may only contain owner 'consumer'",
  ],
  [
    'foreign implementation areas',
    (extension: MutableFixture) => {
      extension.implementationSources.requiredAreas = ['oss-components'];
    },
    "required source area 'oss-components' has owner 'oss' outside its target owner policy",
  ],
  [
    'undeclared implementation areas',
    (extension: MutableFixture) => {
      extension.implementationSources.requiredAreas = ['missing'];
    },
    "references unknown required source area 'missing'",
  ],
  [
    'empty implementation areas',
    (extension: MutableFixture) => {
      extension.implementationSources.requiredAreas = [];
    },
    'implementationSources.requiredAreas must be a non-empty array',
  ],
  [
    'owner-wide source permission',
    (extension: MutableFixture) => {
      extension.implementationSources.additionalOwners = ['consumer'];
    },
    'implementationSources.additionalOwners must be empty',
  ],
  [
    'missing source policy',
    (extension: MutableFixture) => {
      delete extension.implementationSources;
    },
    'must declare implementationSources',
  ],
  [
    'missing target owners',
    (extension: MutableFixture) => {
      delete extension.subpaths.targetOwners;
    },
    'subpath targetOwners must be a non-empty array',
  ],
  [
    'shared bare extension permission',
    (extension: MutableFixture) => {
      extension.kind = 'exact';
      delete extension.subpaths;
      extension.bareTargetOwners = ['consumer'];
      extension.downstream.mayExtendBare = true;
    },
    "permits bare extension and must allow 'consumer' as an additional source owner",
  ],
] as const) {
  test(`rejects consumer alias extensions with ${name}`, () => {
    const fixture = consumerExtensionFixture();
    mutate(fixture.aliasExtensions[0]);
    assert.ok(
      validateAliasContracts(fixture).some((error) => error.includes(expected)),
    );
  });
}

for (const value of [null, {}, 'aliases', [null]]) {
  test(`rejects malformed aliasExtensions ${JSON.stringify(value)}`, () => {
    const fixture = consumerExtensionFixture();
    fixture.aliasExtensions = value;
    assert.ok(validateAliasContracts(fixture).length > 0);
  });
}

test('rejects an extension that relabels all private ownership as OSS', () => {
  const fixture = consumerExtensionFixture();
  fixture.aliasExtensions = [structuredClone(fixture.aliases[1])];
  fixture.aliasExtensions[0].id = 'foreign-private';
  fixture.aliasExtensions[0].specifier = '@foreign';
  assert.deepEqual(validateAliasContracts(fixture), [
    "alias extension 'foreign-private' must be owned by 'consumer'",
  ]);
});

for (const specifier of ['@portable', '@portable/child', '@', '@/child']) {
  test(`rejects a consumer extension overlapping shared ${specifier}`, () => {
    const fixture = consumerExtensionFixture();
    fixture.aliasExtensions[0].specifier = specifier;
    assert.ok(
      validateAliasContracts(fixture).some(
        (error) =>
          error.includes('duplicate alias specifier') ||
          error.includes('overlap semantically'),
      ),
    );
  });
}

test('rejects a consumer namespace covering an existing exact alias', () => {
  const fixture = consumerExtensionFixture();
  fixture.aliases.push(exactAlias('local-entry', '@local/entry'));
  assert.ok(
    validateAliasContracts(fixture).some((error) =>
      error.includes('overlap semantically'),
    ),
  );
});

test('accepts distinct extension subpaths beneath an exact shared alias', () => {
  const fixture = consumerExtensionFixture();
  fixture.aliases.push(exactAlias('exact-local', '@local'));
  fixture.aliasExtensions[0].specifier = '@local/private';
  assert.deepEqual(validateAliasContracts(fixture), []);
});

test('rejects duplicate IDs across shared aliases and extensions', () => {
  const fixture = consumerExtensionFixture();
  fixture.aliasExtensions[0].id = fixture.aliases[0].id;
  assert.ok(
    validateAliasContracts(fixture).includes(
      "duplicate alias or override id 'portable-components'",
    ),
  );
});

test('rejects overlaps between consumer extensions regardless of order', () => {
  const fixture = consumerExtensionFixture();
  const child = consumerAliasExtension();
  const extensions = [
    fixture.aliasExtensions[0],
    { ...child, id: 'consumer-child', specifier: '@local/child' },
  ];
  for (const aliasExtensions of [extensions, [...extensions].reverse()]) {
    assert.ok(
      validateAliasContracts({ ...fixture, aliasExtensions }).some((error) =>
        error.includes('overlap semantically'),
      ),
    );
  }
});

test('rejects resolver overrides that capture consumer extension specifiers', () => {
  const fixture = consumerExtensionFixture();
  fixture.resolverOverrides[0].specifier = '@local/runtime';
  assert.ok(
    validateAliasContracts(fixture).some((error) =>
      error.includes("specifier '@local/runtime' overlaps"),
    ),
  );
});

// Temporary modules and captured diagnostics share one cleanup boundary.
function consumerFixture(t: TestContext) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'alias-contracts-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const errors: string[] = [];
  t.mock.method(console, 'error', (...args: unknown[]) =>
    errors.push(args.join(' ')),
  );
  return {
    directory,
    errors,
    module(name: string, source: string) {
      const filename = path.join(directory, name);
      writeFileSync(filename, source);
      return filename;
    },
    sourceMap(areas: unknown = ossSourceAreas) {
      const filename = path.join(directory, 'source-map.mjs');
      writeFileSync(
        filename,
        `export const sourceAreas = ${JSON.stringify(areas)};\n`,
      );
      return filename;
    },
  };
}

test('accepts consumer-owned source-map and resolver-override modules', async (t) => {
  const io = consumerFixture(t);
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
  const overrides = io.module(
    'overrides.mjs',
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
      [
        '--source-map',
        io.sourceMap(consumerSourceAreas),
        '--resolver-overrides',
        overrides,
      ],
      io.directory,
    ),
    0,
  );
});

test('loads consumer alias extensions from the caller cwd with its source map', async (t) => {
  const io = consumerFixture(t);
  const areas = [
    ...ossSourceAreas,
    {
      id: 'consumer-generated',
      root: 'generated/ui',
      owner: 'consumer',
      role: 'authoritative',
    },
  ];
  io.sourceMap(areas);
  io.module(
    'extensions.mjs',
    `export const aliasExtensions = ${JSON.stringify([consumerAliasExtension()])};`,
  );
  assert.equal(
    await runCli(
      [
        '--source-map',
        './source-map.mjs',
        '--alias-extensions',
        './extensions.mjs',
      ],
      io.directory,
    ),
    0,
  );
  assert.deepEqual(io.errors, []);
});

test('executes the CLI with a TypeScript extension module and file URL source map', (t) => {
  const io = consumerFixture(t);
  const sourceMap = io.sourceMap([
    ...ossSourceAreas,
    {
      id: 'consumer-generated',
      root: 'generated/ui',
      owner: 'consumer',
      role: 'authoritative',
    },
  ]);
  io.module(
    'extensions.ts',
    `export const aliasExtensions: readonly unknown[] = ${JSON.stringify([consumerAliasExtension()])};`,
  );
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      import.meta.resolve('tsx'),
      fileURLToPath(new URL('./check-registry.ts', import.meta.url)),
      '--source-map',
      pathToFileURL(sourceMap).href,
      '--alias-extensions',
      './extensions.ts',
    ],
    { cwd: io.directory, encoding: 'utf8', timeout: 10_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Alias contract validation passed/);
});

test('an empty extension module preserves OSS override defaults', async (t) => {
  const io = consumerFixture(t);
  const module = io.module(
    'extensions.mjs',
    'export const aliasExtensions = [];',
  );
  const defaults = completeRegistryFixture();
  defaults.resolverOverrides[0].specifier = '@portable/Widget';
  assert.equal(
    await runCli(['--alias-extensions', module], io.directory, defaults),
    1,
  );
  assert.match(io.errors.join('\n'), /overlaps a declared alias/);
  assert.equal(
    await runCli(
      [
        '--alias-extensions',
        module,
        '--source-map',
        io.sourceMap(defaults.sourceAreas),
      ],
      io.directory,
      defaults,
    ),
    0,
  );
});

test('extensions cannot use a consumer map to relabel OSS implementation areas', async (t) => {
  const io = consumerFixture(t);
  const areas: MutableFixture = structuredClone(ossSourceAreas);
  areas.find((area: MutableFixture) => area.id === 'oss-components').owner =
    'consumer';
  const extension = consumerAliasExtension();
  const module = io.module(
    'extensions.mjs',
    `export const aliasExtensions = ${JSON.stringify([
      {
        ...extension,
        implementationSources: {
          requiredAreas: ['oss-components'],
          additionalOwners: [],
        },
      },
    ])};`,
  );
  assert.equal(
    await runCli(
      ['--alias-extensions', module, '--source-map', io.sourceMap(areas)],
      io.directory,
    ),
    1,
  );
  assert.match(io.errors.join('\n'), /must preserve OSS owner/);
});

test('rejects an extension when its implementation area is absent', async (t) => {
  const io = consumerFixture(t);
  const module = io.module(
    'extensions.mjs',
    `export const aliasExtensions = ${JSON.stringify([consumerAliasExtension()])};`,
  );
  assert.equal(await runCli(['--alias-extensions', module], io.directory), 1);
  assert.match(io.errors.join('\n'), /unknown required source area/);
});

test('an extension module cannot replace shared aliases', async (t) => {
  const io = consumerFixture(t);
  const module = io.module(
    'extensions.mjs',
    'export const aliasExtensions = []; export const aliases = [];',
  );
  assert.equal(await runCli(['--alias-extensions', module], io.directory), 1);
  assert.match(io.errors.join('\n'), /cannot redefine OSS alias policy/);
});

test('an extension module must export aliasExtensions explicitly', async (t) => {
  const io = consumerFixture(t);
  const module = io.module('extensions.mjs', 'export const unrelated = [];');
  assert.equal(await runCli(['--alias-extensions', module], io.directory), 1);
  assert.match(io.errors.join('\n'), /must export 'aliasExtensions'/);
});

for (const [option, exportName] of [
  ['--source-map', 'sourceAreas'],
  ['--resolver-overrides', 'resolverOverrides'],
  ['--alias-extensions', 'aliasExtensions'],
]) {
  for (const value of ['{}', 'undefined']) {
    test(`rejects malformed ${exportName} module exports (${value})`, async (t) => {
      const io = consumerFixture(t);
      const module = io.module(
        'consumer.mjs',
        `export const ${exportName} = ${value};`,
      );
      assert.equal(await runCli([option!, module], io.directory), 1);
      assert.ok(
        io.errors.join('\n').includes(`${exportName} must be an array`),
      );
    });
  }
}

test('requires a module path for --alias-extensions', async (t) => {
  const io = consumerFixture(t);
  assert.equal(await runCli(['--alias-extensions'], io.directory), 1);
  assert.match(
    io.errors.join('\n'),
    /--alias-extensions requires a module path/,
  );
});

test('documents --alias-extensions in CLI help', async (t) => {
  const output: string[] = [];
  t.mock.method(console, 'log', (message: string) => output.push(message));
  assert.equal(await runCli(['--help']), 0);
  assert.match(output.join('\n'), /--alias-extensions <module>/);
});

test('a source-map-only consumer does not inherit OSS overrides', async (t) => {
  const io = consumerFixture(t);
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
  assert.equal(await runCli([], io.directory, defaults), 1);
  assert.equal(
    await runCli(['--source-map', io.sourceMap()], io.directory, defaults),
    0,
  );
});

test('consumer modules cannot redefine OSS alias policy', async (t) => {
  const io = consumerFixture(t);
  const sourceMap = io.module(
    'source-map.mjs',
    `export const aliases = [];\nexport const sourceAreas = ${JSON.stringify(ossSourceAreas)};`,
  );
  assert.equal(await runCli(['--source-map', sourceMap], io.directory), 1);
  assert.match(io.errors.join('\n'), /cannot redefine OSS alias policy/);
});

test('consumer source maps must retain every OSS source-area ID', async (t) => {
  const io = consumerFixture(t);
  const sourceMap = io.sourceMap(
    ossSourceAreas.filter(({ id }) => id !== 'oss-version-data'),
  );
  assert.equal(await runCli(['--source-map', sourceMap], io.directory), 1);
  assert.match(
    io.errors.join('\n'),
    /missing required OSS source area 'oss-version-data'/,
  );
});

test('consumer source maps cannot change a shared source-area owner', async (t) => {
  const io = consumerFixture(t);
  const areas: MutableFixture = structuredClone(ossSourceAreas);
  areas.find((area: MutableFixture) => area.id === 'oss-components').owner =
    'consumer';
  assert.equal(
    await runCli(['--source-map', io.sourceMap(areas)], io.directory),
    1,
  );
  assert.match(io.errors.join('\n'), /must preserve OSS owner/);
});

test('additional consumer source areas must remain consumer-owned', async (t) => {
  const io = consumerFixture(t);
  const sourceAreas = [
    ...structuredClone(ossSourceAreas),
    {
      id: 'downstream-private-source',
      root: 'downstream/src',
      owner: 'lynx-website',
      role: 'authoritative',
    },
  ];
  assert.equal(
    await runCli(['--source-map', io.sourceMap(sourceAreas)], io.directory),
    1,
  );
  assert.match(
    io.errors.join('\n'),
    /additional source area .* must be owned by 'consumer'/,
  );
});

test('an override module must explicitly declare its local overrides', async (t) => {
  const io = consumerFixture(t);
  const overrides = io.module(
    'overrides.mjs',
    'export const unrelated = [];\n',
  );
  assert.equal(
    await runCli(['--resolver-overrides', overrides], io.directory),
    1,
  );
  assert.match(io.errors.join('\n'), /must export 'resolverOverrides'/);
});

test('malformed consumer fields return a CLI failure', async (t) => {
  const io = consumerFixture(t);
  const areas: MutableFixture = structuredClone(ossSourceAreas);
  areas[0].owner = { toString: null };
  assert.equal(
    await runCli(['--source-map', io.sourceMap(areas)], io.directory),
    1,
  );
  assert.match(io.errors.join('\n'), /references unknown owner/);
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

test('validates consumer modules from the package produced by pnpm pack', async (t) => {
  const io = consumerFixture(t);
  const website = fileURLToPath(new URL('../..', import.meta.url));
  const packOutput = execFileSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    [
      '--config.ignore-scripts=true',
      'pack',
      '--pack-destination',
      io.directory,
      '--json',
    ],
    {
      cwd: website,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const packResult = JSON.parse(packOutput);
  const filename = Array.isArray(packResult)
    ? packResult[0].filename
    : packResult.filename;
  const installed = path.join(io.directory, 'node_modules/@lynx-js/lynx-doc');
  mkdirSync(installed, { recursive: true });
  execFileSync(
    'tar',
    [
      '-xzf',
      path.resolve(io.directory, filename),
      '-C',
      installed,
      '--strip-components=1',
    ],
    { timeout: 30_000 },
  );
  // Model the documented consumer dependency without a network install.
  // Only tsx is linked; all checker files come from the complete tarball.
  io.module(
    'package.json',
    JSON.stringify({
      name: 'alias-contract-consumer',
      private: true,
      type: 'module',
      devDependencies: { tsx: '*' },
    }),
  );
  symlinkSync(
    realpathSync(path.join(website, 'node_modules/tsx')),
    path.join(io.directory, 'node_modules/tsx'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const contractPath =
    './node_modules/@lynx-js/lynx-doc/scripts/alias-contracts';
  const checker = `${contractPath}/check-registry.ts`;
  const registry = `${contractPath}/registry.ts`;
  const areas = [
    ...ossSourceAreas.map((area) => ({
      ...area,
      root: `mounted/${area.id}`,
    })),
    {
      id: 'consumer-generated',
      root: 'generated/ui',
      owner: 'consumer',
      role: 'authoritative',
    },
  ];
  const moduleExports = [
    ['--source-map', 'source-map.mjs', 'sourceAreas', areas],
    [
      '--resolver-overrides',
      'overrides.mjs',
      'resolverOverrides',
      completeRegistryFixture().resolverOverrides,
    ],
    [
      '--alias-extensions',
      'extensions.ts',
      'aliasExtensions',
      [consumerAliasExtension()],
    ],
  ] as const;
  const args = moduleExports.flatMap(([option, filename]) => [
    option,
    `./${filename}`,
  ]);
  function writeModules(mutationExport?: string, mutation = '') {
    for (const [, filename, exportName, value] of moduleExports) {
      const data = structuredClone(value);
      if (mutationExport && exportName === 'aliasExtensions') {
        (data as MutableFixture)[0].specifier = '@lynx';
      }
      io.module(
        filename,
        [
          `import { aliases } from '${registry}';`,
          exportName === mutationExport ? mutation : '',
          exportName === 'aliasExtensions'
            ? `import type { ConsumerAliasExtension } from '${contractPath}/types.js';`
            : '',
          `export const ${exportName} = ${JSON.stringify(data)}${
            exportName === 'aliasExtensions'
              ? ' satisfies readonly ConsumerAliasExtension[]'
              : ''
          };`,
        ].join('\n'),
      );
    }
  }
  function execute(entry: string, cliArgs: readonly string[] = []) {
    return spawnSync(process.execPath, ['--import', 'tsx', entry, ...cliArgs], {
      cwd: io.directory,
      encoding: 'utf8',
      timeout: 10_000,
    });
  }

  await t.test('loads all three options from the consumer cwd', () => {
    writeModules();
    const result = execute(checker, args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Alias contract validation passed/);
  });

  await t.test('rejects an explicitly undefined extension export', () => {
    writeModules();
    io.module('extensions.ts', 'export const aliasExtensions = undefined;');
    const result = execute(checker, args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /aliasExtensions must be an array/);
  });

  // Repeat in the same process to detect contamination of later invocations.
  const runner = io.module(
    'runner.mjs',
    `import { runCli } from '${checker}';
const args = ${JSON.stringify(args)};
const codes = [await runCli(args), await runCli(args)];
console.log(JSON.stringify(codes));`,
  );
  for (const [, , exportName] of moduleExports) {
    for (const [label, mutation] of [
      ['array removal', 'aliases.splice(0, aliases.length);'],
      [
        'record mutation',
        "aliases.find(alias => alias.specifier === '@lynx').specifier = '@renamed';",
      ],
    ]) {
      await t.test(
        `${exportName} ${label} cannot reclaim shared aliases`,
        () => {
          writeModules(exportName, mutation);
          const result = execute(runner);
          assert.equal(result.status, 0, result.stderr);
          assert.match(result.stdout, /\[1,1\]/);
          assert.match(result.stderr, /duplicate alias specifier '@lynx'/);
        },
      );
    }
  }

  await t.test(
    'preserves shared owner and source-area policy after mutation',
    () => {
      io.module(
        'source-map.mjs',
        `import { owners, ossSourceAreas } from '${registry}';
owners.push({ id: 'foreign', description: 'Foreign owner' });
ossSourceAreas.find(area => area.id === 'oss-components').owner = 'foreign';
export const sourceAreas = ossSourceAreas;`,
      );
      const result = execute(checker, ['--source-map', './source-map.mjs']);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /references unknown owner 'foreign'/);
      assert.match(result.stderr, /must preserve OSS owner 'lynx-website'/);
    },
  );

  await t.test(
    'snapshots caller-supplied defaults before importing modules',
    () => {
      const defaults = completeRegistryFixture();
      // A consumer module must not be able to erase this existing conflict.
      defaults.resolverOverrides[0].specifier = '@portable/Widget';
      io.module(
        'defaults.mjs',
        `export const defaults = ${JSON.stringify(defaults)};`,
      );
      io.module(
        'empty-extensions.mjs',
        `import { defaults } from './defaults.mjs';
defaults.resolverOverrides.splice(0, defaults.resolverOverrides.length);
export const aliasExtensions = [];`,
      );
      const entry = io.module(
        'custom-defaults.mjs',
        `import { runCli } from '${checker}';
import { defaults } from './defaults.mjs';
process.exitCode = await runCli(
  ['--alias-extensions', './empty-extensions.mjs'], process.cwd(), defaults
);`,
      );
      const result = execute(entry);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /overlaps a declared alias/);
    },
  );
});
