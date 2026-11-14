import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadContracts, validateAliasContracts } from './check-registry.js';
import {
  baselineInventory,
  checkImportPolicy,
  compareBaseline,
  parseBaseline,
  type PolicyViolation,
} from './check-import-policy.js';
import { configurationCorpus, type ImportRecord } from './corpus.js';
import type { Runtime } from './runtime.js';
import type { ConsumerAliasExtension } from './types.js';

mkdirSync(path.join(process.cwd(), 'node_modules/.cache'), { recursive: true });

test('exact baseline rejects increased, moved, changed, duplicate and stale debt', () => {
  const violation: PolicyViolation = {
    rule: 'migration-subpath',
    file: 'docs/en/page.mdx',
    specifier: '@lynx/Example',
    line: 1,
    importerOwner: 'lynx-website',
    targetOwner: 'lynx-website',
    replacement: 'bare-entry:@lynx',
    message: 'legacy',
    baselinable: true,
  };
  const baseline = baselineInventory([violation, { ...violation, line: 2 }]);
  assert.equal(baseline[0]!.count, 2);
  assert.deepEqual(compareBaseline([violation, violation], baseline), []);
  for (const observed of [
    [],
    [violation],
    [violation, violation, violation],
    [{ ...violation, file: 'docs/en/moved.mdx' }],
    [{ ...violation, specifier: '@lynx/Other' }],
    [{ ...violation, baselinable: false }],
  ])
    assert.ok(compareBaseline(observed, baseline).length);
  assert.throws(() => parseBaseline([...baseline, ...baseline]), /Duplicate/);
  for (const entry of [
    { ...baseline[0], file: 'docs/**' },
    { ...baseline[0], count: 0 },
    { ...baseline[0], count: 1.2 },
    { ...baseline[0], rule: 'target-policy' },
    { ...baseline[0], extra: true },
    { ...baseline[0], file: '../escape' },
  ])
    assert.throws(() => parseBaseline([entry]), /Invalid/);
});

test('policy checks raw spellings, owners, targets, types, settings and portable boundaries', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/policy-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const write = (file: string, content = '') => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };
  const contracts = await loadContracts();
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'consumer-local',
      root: 'local',
      owner: 'consumer',
      role: 'authoritative',
      boundary: 'runtime',
    },
    {
      id: 'consumer-other',
      root: 'other',
      owner: 'consumer',
      role: 'authoritative',
    },
    {
      id: 'relocated-docs',
      root: 'content',
      owner: 'consumer',
      role: 'authoritative',
      boundary: 'documentation',
    },
  ];
  contracts.documentationScope = { roots: ['prepared'] };
  const extension: ConsumerAliasExtension = {
    id: 'local',
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
    allowMultipleResolverRoots: true,
    implementationSources: {
      requiredAreas: ['consumer-local'],
      additionalOwners: [],
    },
    downstream: { implementation: 'required' },
    lifecycle: { state: 'stable', changePolicy: 'owner-controlled' },
  };
  contracts.aliases = [...contracts.aliases, extension];
  const paths = {
    '@lynx/entry/index.tsx': 'src/components/entry/index.tsx',
    '@lynx/entry/index.tsx?raw': 'src/components/entry/index.tsx',
    '@lynx/entry/index?raw': 'src/components/entry/index.tsx',
    '@lynx/entry/value.tsx?raw': 'src/components/entry/value.tsx',
    '@lynx/entry/value?raw=example.tsx': 'src/components/entry/value.tsx',
    '@theme/entry/index.tsx#fragment': 'theme/entry/index.tsx#fragment',
    '@theme/entry/index#fragment': 'theme/entry/index.tsx#fragment',
    '@theme/entry/value.tsx#fragment': 'theme/entry/value.tsx#fragment',
    '@theme/entry/value#fragment.tsx': 'theme/entry/value.tsx#fragment.tsx',
    '@theme/entry/value.tsx?raw#fragment': 'theme/entry/value.tsx?raw#fragment',
    '@theme/entry/value.tsx#fragment?raw': 'theme/entry/value.tsx#fragment?raw',
    '@/types': 'src/lib/types.ts',
    '@/private': 'src/lib/private.ts',
    '@/shadow': 'local/child.ts',
    '@local/child': 'local/child.ts',
    '@local/outside': 'other/child.ts',
    '@local/escape': 'local/escape/child.ts',
    '@local/fallback': 'other/child.ts',
    '@local/missing': undefined,
    '@assets/icon.svg': 'docs/public/assets/icon.svg',
    '@theme/entry.scss': 'theme/entry.scss',
    '../runtime': 'local/child.ts',
    '../document': 'content/page.mdx',
    '../scope-document': 'prepared/page.mdx',
    '../version': 'docs/public/version.json',
  };
  for (const file of Object.values(paths))
    if (file && !file.includes('/escape/')) write(file);
  write('src/lib/types.ts', 'export interface Shape {}');
  write('undeclared/child.ts');
  symlinkSync(path.join(cwd, 'undeclared'), path.join(cwd, 'local/escape'));
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        moduleResolution: 'bundler',
        module: 'esnext',
        paths: { '@/*': ['src/lib/*'] },
      },
    }),
  );
  const requests: string[] = [];
  const runtime: Runtime = {
    explicitAliases: {},
    environments: ['web', 'node', 'node_md'].map((name) => ({
      name,
      aliases: { '@': path.join(cwd, 'src') },
      resolve: async (_importer, request) => {
        requests.push(request);
        const file = paths[request as keyof typeof paths];
        return file ? path.join(cwd, file) : undefined;
      },
    })),
    close: async () => {},
  };
  const record = (
    specifier: string,
    changes: Partial<ImportRecord> = {},
  ): ImportRecord => ({
    importer: 'src/components/importer.ts',
    sourceArea: 'oss-components',
    owner: 'lynx-website',
    role: 'authoritative',
    boundary: 'runtime',
    kind: 'import',
    line: 1,
    specifier,
    bindings: [],
    ...changes,
  });
  const rules = async (entry: ImportRecord) =>
    (await checkImportPolicy(cwd, contracts, [entry], runtime)).map(
      (entry) => entry.rule,
    );
  const consumer = {
    importer: 'local/importer.ts',
    sourceArea: 'consumer-local',
    owner: 'consumer' as const,
  };
  assert.deepEqual(await rules(record('@local/child', consumer)), []);
  assert.ok((await rules(record('@local/child'))).includes('importer-owner'));
  for (const specifier of [
    '@local/outside',
    '@local/escape',
    '@local/fallback',
  ])
    assert.ok(
      (await rules(record(specifier, consumer))).includes('target-policy'),
    );
  assert.ok(
    (await rules(record('@local/missing', consumer))).includes(
      'unresolved-target',
    ),
  );
  assert.ok(
    (await rules(record('@/private', consumer))).includes(
      'cross-owner-private',
    ),
  );
  assert.ok((await rules(record('@/shadow'))).includes('target-policy'));
  const producer = {
    importer: 'content/producer.mdx',
    owner: 'consumer:tools-docs' as const,
    role: 'generated' as const,
    boundary: 'documentation' as const,
  };
  assert.deepEqual(await rules(record('@theme/entry.scss', producer)), []);
  for (const specifier of ['@local/child', '@/private'])
    assert.ok(
      (await rules(record(specifier, producer))).includes('importer-owner'),
    );
  const producerViolations = await checkImportPolicy(
    cwd,
    contracts,
    [record('@lynx/entry/index.tsx', producer)],
    runtime,
  );
  assert.ok(producerViolations.length);
  assert.ok(producerViolations.every((violation) => !violation.baselinable));
  assert.deepEqual(
    await rules(
      record('@/types', { bindings: [{ name: 'Shape', typeOnly: true }] }),
    ),
    [],
  );
  assert.ok(
    !requests.includes('@/types'),
    'erased imports use TS, not runtime',
  );
  const raw = await checkImportPolicy(
    cwd,
    contracts,
    [record('@lynx/entry/index.tsx')],
    runtime,
  );
  assert.deepEqual(
    raw.map((entry) => entry.rule),
    ['migration-subpath', 'canonical-spelling'],
  );
  assert.deepEqual(
    baselineInventory(raw).map((entry) => entry.count),
    [1, 1],
  );
  const repeated = record('@lynx/entry/index.tsx');
  assert.deepEqual(
    baselineInventory(
      await checkImportPolicy(cwd, contracts, [repeated, repeated], runtime),
    ).map((entry) => entry.count),
    [2, 2],
  );
  assert.ok(requests.includes('@lynx/entry/index.tsx'));
  assert.ok(!requests.includes('@lynx/entry'));
  for (const [specifier, canonicalDebt] of [
    ['@lynx/entry/index.tsx?raw', true],
    ['@lynx/entry/index?raw', true],
    ['@lynx/entry/value.tsx?raw', true],
    ['@lynx/entry/value?raw=example.tsx', false],
    ['@theme/entry/index.tsx#fragment', true],
    ['@theme/entry/index#fragment', true],
    ['@theme/entry/value.tsx#fragment', true],
    ['@theme/entry/value#fragment.tsx', false],
    ['@theme/entry/value.tsx?raw#fragment', true],
    ['@theme/entry/value.tsx#fragment?raw', true],
  ] as const) {
    const requestCount = requests.length;
    const queryViolations = await checkImportPolicy(
      cwd,
      contracts,
      [record(specifier)],
      runtime,
    );
    assert.equal(
      queryViolations.some((entry) => entry.rule === 'canonical-spelling'),
      canonicalDebt,
      specifier,
    );
    assert.ok(queryViolations.every((entry) => entry.specifier === specifier));
    if (canonicalDebt)
      assert.ok(
        queryViolations
          .find((entry) => entry.rule === 'canonical-spelling')!
          .replacement.endsWith(specifier.slice(specifier.search(/[?#]/))),
      );
    assert.ok(
      baselineInventory(queryViolations).every(
        (entry) => entry.specifier === specifier && entry.count === 1,
      ),
    );
    assert.deepEqual(requests.slice(requestCount), [
      specifier,
      specifier,
      specifier,
    ]);
  }
  const generated = await checkImportPolicy(
    cwd,
    contracts,
    [record('@lynx/entry/index.tsx', { role: 'generated' })],
    runtime,
  );
  assert.deepEqual(baselineInventory(generated), []);
  assert.ok(generated.every((entry) => !entry.baselinable));
  assert.ok(
    (await rules(record('@/private', { boundary: 'documentation' }))).includes(
      'document-private',
    ),
  );
  assert.ok(
    (
      await rules(record('@assets/icon.svg', { boundary: 'documentation' }))
    ).includes('document-assets'),
  );
  assert.ok(
    (await rules(record('@assets/icon.svg'))).includes('retired-alias'),
  );
  assert.deepEqual(await rules(record('@theme/entry.scss')), []);
  assert.ok(
    (await rules(record('../runtime', { boundary: 'documentation' }))).includes(
      'relative-boundary',
    ),
  );
  assert.ok((await rules(record('../document'))).includes('relative-boundary'));
  for (const specifier of ['../../prepared/page.mdx?raw', '../scope-document'])
    assert.deepEqual(await rules(record(specifier)), ['relative-boundary']);
  assert.ok((await rules(record('../version'))).includes('version-data'));
  assert.ok(
    !(
      await rules(
        record('../version', {
          boundary: undefined,
          owner: 'consumer',
          importer: 'shared-route-config.ts',
        }),
      )
    ).length,
  );
  const settings = [
    record('@/lib', { kind: 'configuration', importer: 'components.json' }),
    record('@/lib', {
      kind: 'configuration',
      importer: 'components.json',
      owner: 'consumer',
    }),
  ];
  write('src/lib/namespace-marker.ts');
  const result = await checkImportPolicy(cwd, contracts, settings, runtime);
  assert.deepEqual(
    result.map((entry) => entry.rule),
    ['cross-owner-private'],
  );
  for (const modifier of [
    '?raw',
    '#fragment',
    '?raw#fragment',
    '#fragment?raw',
  ])
    assert.deepEqual(
      (
        await checkImportPolicy(
          cwd,
          contracts,
          settings.map((entry) => ({
            ...entry,
            specifier: `${entry.specifier}${modifier}`,
          })),
          runtime,
        )
      ).map((entry) => entry.rule),
      ['cross-owner-private'],
    );
  // Generator namespace roots can be bare even for subpaths-only imports.
  for (const environment of runtime.environments)
    environment.aliases['@local'] = path.join(cwd, 'local');
  const namespace = record('@local', {
    ...consumer,
    kind: 'configuration',
    importer: 'components.json',
  });
  assert.deepEqual(await rules(namespace), []);
  assert.ok(
    (await rules({ ...namespace, kind: 'import' })).includes('alias-shape'),
  );
  assert.ok(
    (await rules({ ...namespace, owner: 'lynx-website' })).includes(
      'importer-owner',
    ),
  );
  for (const environment of runtime.environments)
    environment.aliases['@local'] = path.join(cwd, 'other');
  assert.ok((await rules(namespace)).includes('target-policy'));
  contracts.resolverOverrides = [
    {
      id: 'override',
      specifier: 'legacy-package/private',
      kind: 'package-compatibility',
      match: 'exact',
      reason: 'fixture',
      parity: { runtime: 'override-required', typescript: 'not-applicable' },
      lifecycle: 'temporary',
      removalCondition: 'upgrade',
    },
  ];
  assert.deepEqual(await rules(record('legacy-package/private')), [
    'resolver-override',
  ]);
});

test('resource modifiers retain importer, target, shape and override policy', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/policy-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(path.join(cwd, 'tsconfig.json'), '{}');
  mkdirSync(path.join(cwd, 'src/luna'), { recursive: true });
  mkdirSync(path.join(cwd, 'src/lib'), { recursive: true });
  writeFileSync(path.join(cwd, 'src/luna/index.ts'), '');
  writeFileSync(path.join(cwd, 'src/lib/private.ts'), '');
  const contracts = await loadContracts();
  contracts.resolverOverrides = [
    {
      id: 'override',
      specifier: 'legacy-package/private',
      kind: 'package-compatibility',
      match: 'exact',
      reason: 'fixture',
      parity: { runtime: 'override-required', typescript: 'not-applicable' },
      lifecycle: 'temporary',
      removalCondition: 'upgrade',
    },
  ];
  for (const fixture of [
    { request: '@luna', rules: [] },
    {
      request: '@luna',
      owner: 'lynx-stack' as const,
      rules: ['importer-owner'],
    },
    {
      request: '@luna',
      owner: 'lynx-stack' as const,
      typeOnly: true,
      rules: ['importer-owner', 'unresolved-target'],
    },
    {
      request: '@luna',
      target: 'src/lib/private.ts',
      rules: ['target-policy'],
    },
    { request: '@luna', missing: true, rules: ['unresolved-target'] },
    { request: '@luna/child', rules: ['alias-shape', 'target-policy'] },
    {
      request: '@docs',
      missing: true,
      rules: ['alias-shape', 'unresolved-target'],
    },
    { request: '@luna', kind: 'require' as const, rules: ['commonjs-alias'] },
    { request: 'legacy-package/private', rules: ['resolver-override'] },
  ]) {
    await t.test(JSON.stringify(fixture), async () => {
      for (const modifier of [
        '',
        '?raw',
        '#fragment',
        '?raw#fragment',
        '#fragment?raw',
      ]) {
        const specifier = `${fixture.request}${modifier}`;
        const requests: string[] = [];
        const runtime: Runtime = {
          explicitAliases: {},
          environments: ['web', 'node', 'node_md'].map((name) => ({
            name,
            aliases: {},
            resolve: async (_importer, request) => {
              requests.push(request);
              return fixture.missing
                ? undefined
                : path.join(cwd, fixture.target ?? 'src/luna/index.ts') +
                    modifier;
            },
          })),
          close: async () => {},
        };
        const violations = await checkImportPolicy(
          cwd,
          contracts,
          [
            {
              importer: 'src/luna/importer.ts',
              sourceArea: 'oss-luna',
              owner: fixture.owner ?? 'lynx-website',
              role: 'authoritative',
              boundary: 'runtime',
              kind: fixture.kind ?? 'import',
              line: 1,
              specifier,
              bindings: fixture.typeOnly
                ? [{ name: 'Shape', typeOnly: true }]
                : [],
            },
          ],
          runtime,
        );
        assert.deepEqual(
          [...new Set(violations.map((entry) => entry.rule))].sort(),
          [...fixture.rules].sort(),
          specifier,
        );
        assert.ok(
          violations.every(
            (entry) => entry.specifier === specifier && !entry.baselinable,
          ),
        );
        assert.deepEqual(
          requests,
          fixture.typeOnly || fixture.request === 'legacy-package/private'
            ? []
            : [specifier, specifier, specifier],
        );
      }
    });
  }
});

test('only registered generator fields are scanned and malformed settings fail closed', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/policy-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const shared = await loadContracts();
  const area = {
    ...shared.sourceAreas.find((area) => area.id === 'oss-components')!,
    moduleSpecifierFields: [
      { file: 'settings.json', path: ['aliases', 'components'] as const },
    ],
  };
  assert.deepEqual(configurationCorpus(cwd, [area]), []);
  writeFileSync(
    path.join(cwd, 'settings.json'),
    JSON.stringify({
      aliases: { components: '@/components', arbitrary: '@assets/unscanned' },
      prose: 'import from @lynx/ignored',
    }),
  );
  const corpus = configurationCorpus(cwd, [area]);
  assert.deepEqual(
    corpus.map((entry) => [entry.owner, entry.specifier, entry.kind]),
    [['lynx-website', '@/components', 'configuration']],
  );
  assert.throws(() => configurationCorpus(cwd, [area, area]), /duplicate/);
  for (const content of [
    '{invalid',
    '{"aliases":{}}',
    '{"aliases":{"components":5}}',
  ]) {
    writeFileSync(path.join(cwd, 'settings.json'), content);
    assert.throws(() => configurationCorpus(cwd, [area]));
  }
  for (const field of [
    { file: '../escape.json', path: ['alias'] },
    { file: 'settings.json', path: [] },
    { file: 'settings.ts', path: ['alias'] },
  ]) {
    assert.ok(
      validateAliasContracts({
        ...shared,
        sourceAreas: [{ ...area, moduleSpecifierFields: [field] }],
      }).some((error) => error.includes('invalid module specifier field')),
    );
  }
  assert.ok(
    validateAliasContracts({
      ...shared,
      sourceAreas: [
        ...shared.sourceAreas,
        area,
        { ...area, id: 'duplicate-fields' },
      ],
    }).some((error) => error.includes('duplicate module specifier field')),
  );
});
