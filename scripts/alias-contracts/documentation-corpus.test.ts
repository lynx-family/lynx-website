import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadContracts } from './check-registry.js';
import { canonical, discoverCorpus, portableBoundary } from './corpus.js';
import { relativeBoundaryTarget } from './boundary.js';
import { checkImportPolicy, compareBaseline } from './check-import-policy.js';
import { checkResolution } from './check-resolution.js';
import {
  documentationDigest,
  preparedDocumentation,
  snapshotDocumentation,
  validateDocumentationCorpus,
  validateDocumentationScope,
} from './documentation-corpus.js';
import { createRuntime, type Runtime } from './runtime.js';
import type {
  DocumentationCorpus,
  OwnerId,
  PreparedDocument,
} from './types.js';

function fixture(t: test.TestContext) {
  const cache = path.join(process.cwd(), 'node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const cwd = mkdtempSync(path.join(cache, 'prepared-docs-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', cwd]);
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };
  write('package.json', '{"type":"module"}');
  mkdirSync(path.join(cwd, 'assembled'));
  const data: { roots: string[]; files: PreparedDocument[] } = {
    roots: ['assembled'],
    files: [],
  };
  const output = (
    file: string,
    content: string,
    owner: OwnerId = 'lynx-website',
    annotations: Pick<PreparedDocument, 'imports' | 'origins'> = {},
  ) => {
    write(file, content);
    data.files.push({
      file,
      sha256: documentationDigest(content),
      owner,
      ...annotations,
    });
  };
  return { cwd, write, data, output };
}

test('final file owners and mixed import overrides feed both runtime gates', async (t) => {
  const io = fixture(t);
  const website =
    '---\ntitle: 测试 😀\n---\n\nimport { Value } from "@lynx";\n\n# Heading {#id}\n\n';
  const tail = '<Example data={import("@lynx")} />\n';
  const origins = [{ repository: 'lynx-family/lynx-stack', root: 'docs/**' }];
  io.output('assembled/copied.mdx', website);
  io.output('assembled/tail.mdx', website + tail, 'lynx-website', {
    imports: [{ index: 1, specifier: '@lynx', owner: 'consumer' }],
  });
  io.output(
    'assembled/stack.mdx',
    'import { Value } from "@lynx";\n',
    'lynx-stack',
    { origins },
  );
  io.output(
    'assembled/full.mdx',
    'import { Value } from "@lynx";\n',
    'consumer:tools-docs',
  );
  io.output('assembled/plain.md', 'import { Value } from "@lynx";\n');
  io.output('assembled/empty.mdx', '');
  const shared = await loadContracts();
  io.write(
    'source-map.mjs',
    `
export const sourceAreas = ${JSON.stringify(shared.sourceAreas)};
export const ownerExtensions = [{ id: 'consumer:tools-docs', description: 'Tools docs', scope: 'documentation' }];
`,
  );
  io.write(
    'corpus.mjs',
    `export const documentationCorpus = ${JSON.stringify(io.data)};`,
  );
  const contracts = await loadContracts(
    {
      sourceMap: './source-map.mjs',
      documentationCorpus: './corpus.mjs',
    },
    io.cwd,
  );
  const corpus = discoverCorpus(io.cwd, contracts);
  assert.deepEqual(
    corpus.map((r) => [r.importer, r.owner, r.specifier, r.line]),
    [
      ['assembled/copied.mdx', 'lynx-website', '@lynx', 5],
      ['assembled/full.mdx', 'consumer:tools-docs', '@lynx', 1],
      ['assembled/stack.mdx', 'lynx-stack', '@lynx', 1],
      ['assembled/tail.mdx', 'lynx-website', '@lynx', 5],
      ['assembled/tail.mdx', 'consumer', '@lynx', 9],
    ],
  );
  assert.ok(
    corpus.every(
      (r) =>
        r.role === 'generated' &&
        r.documentation &&
        r.boundary === 'documentation',
    ),
  );
  assert.deepEqual(corpus[2]!.origins, origins);
  assert.deepEqual(discoverCorpus(io.cwd, contracts), corpus);
  assert.equal(
    contracts.sourceAreas.some((area) => area.root === 'assembled'),
    false,
  );
  assert.equal(
    relativeBoundaryTarget(
      io.cwd,
      contracts.sourceAreas,
      {
        importer: 'src/components/example.ts',
        specifier: '../../assembled/copied.mdx',
        boundary: 'runtime',
      },
      [],
      io.data.roots,
    ),
    'assembled/copied.mdx',
  );
  assert.equal(
    relativeBoundaryTarget(
      io.cwd,
      contracts.sourceAreas,
      {
        ...corpus[0]!,
        specifier: '../src/components/absent.ts',
      },
      [],
      io.data.roots,
    ),
    'src/components/absent.ts',
  );
  symlinkSync(
    path.join(process.cwd(), 'node_modules'),
    path.join(io.cwd, 'node_modules'),
  );
  io.write('src/components/index.ts', 'export const Value = 1;');
  io.write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
        paths: { '@lynx': ['src/components/index.ts'] },
      },
    }),
  );
  contracts.aliases = contracts.aliases.filter(
    (alias) => alias.specifier === '@lynx',
  );
  const runtime = await createRuntime(io.cwd, {
    root: path.join(io.cwd, 'assembled'),
    themeDir: path.join(io.cwd, 'theme'),
    mediumZoom: false,
    ssg: true,
    llms: true,
    builderConfig: {
      resolve: {
        alias: { '@lynx': path.join(io.cwd, 'src/components/index.ts') },
      },
    },
  });
  t.after(() => runtime.close());
  assert.deepEqual(
    (await checkResolution(io.cwd, contracts, corpus, runtime)).errors,
    [],
  );
  assert.deepEqual(
    await checkImportPolicy(io.cwd, contracts, corpus, runtime),
    [],
  );
});

test('snapshots cover no-import files and syntax indices before corpus sorting', async (t) => {
  const io = fixture(t);
  const content = 'import "@theme"; import "@lynx";\n';
  io.write('assembled/page.ts', content);
  io.write('assembled/empty.mdx', '');
  io.write('assembled/plain.md', '# Prose');
  io.write('assembled/.hidden/ignored.ts', 'import "@lynx";');
  io.write('assembled/node_modules/ignored.ts', 'import "@lynx";');
  const data = snapshotDocumentation(
    io.cwd,
    io.data.roots,
    (file) => ({
      owner: 'skills',
      ...(file.endsWith('.ts')
        ? {
            imports: [
              { index: 0, specifier: '@theme', owner: 'consumer' as const },
            ],
          }
        : {}),
    }),
    canonical,
  );
  assert.deepEqual(
    data.files.map((file) => file.file),
    ['assembled/empty.mdx', 'assembled/page.ts', 'assembled/plain.md'],
  );
  const contracts = await loadContracts();
  contracts.documentationCorpus = validateDocumentationCorpus(
    data,
    contracts.owners,
  );
  assert.deepEqual(
    discoverCorpus(io.cwd, contracts).map((r) => [r.specifier, r.owner]),
    [
      ['@lynx', 'skills'],
      ['@theme', 'consumer'],
    ],
  );
  io.write(
    'assembled/page.ts',
    '// rewritten within the same owner\n' + content,
  );
  assert.throws(
    () => discoverCorpus(io.cwd, contracts),
    /stale documentation snapshot/,
  );
});

test('mixed import annotations reject drift after insertion, reordering or request changes', async (t) => {
  const io = fixture(t);
  const original = 'import "@lynx";\nimport "@luna?raw";\n';
  const annotations = {
    imports: [{ index: 1, specifier: '@luna?raw', owner: 'consumer' as const }],
  };
  const contracts = await loadContracts();
  const scan = (content: string) => {
    io.write('assembled/page.ts', content);
    contracts.documentationCorpus = validateDocumentationCorpus(
      snapshotDocumentation(
        io.cwd,
        io.data.roots,
        () => ({ owner: 'lynx-website', ...annotations }),
        canonical,
      ),
      contracts.owners,
    );
    return discoverCorpus(io.cwd, contracts);
  };
  assert.equal(
    scan(original).find((r) => r.specifier === '@luna?raw')!.owner,
    'consumer',
  );
  for (const content of [
    'import "@theme";\n' + original,
    'import "@luna?raw";\nimport "@lynx";\n',
    original.replace('@luna?raw', '@luna?url'),
  ])
    assert.throws(
      () => scan(content),
      /import ownership index 1 expects "@luna\?raw".*regenerate import annotations/,
    );
  assert.equal(scan('// new prose and formatting\n' + original).length, 2);
});

test('prepared inventory alone discovers documents while source areas still discover runtime and configuration', async (t) => {
  const io = fixture(t);
  io.output('assembled/page.mdx', 'import "@lynx";', 'consumer');
  io.output('assembled/empty.ts', 'export const value = 1;');
  io.write('legacy/ignored.ts', 'import { from "broken";');
  io.write('docs/ignored.mdx', 'import { from "broken";');
  io.write('src/components/runtime.ts', 'import "@lynx";');
  io.write('site.ts', 'import "@theme";');
  io.write('generator.json', '{"module":"@lynx"}');
  execFileSync('git', ['add', 'assembled', 'legacy', 'docs', 'site.ts'], {
    cwd: io.cwd,
  });
  symlinkSync('assembled', path.join(io.cwd, 'document-mount'));
  symlinkSync('src/components', path.join(io.cwd, 'runtime-mount'));
  const contracts = await loadContracts();
  contracts.documentationScope = {
    roots: ['assembled', 'legacy'],
    trackedSource: { id: 'tracked', owner: 'lynx-website' },
  };
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'legacy-docs',
      root: 'legacy',
      owner: 'skills',
      role: 'authoritative',
      boundary: 'documentation',
      moduleSpecifierFields: [{ file: 'generator.json', path: ['module'] }],
    },
    {
      id: 'other-docs',
      root: 'docs',
      owner: 'skills',
      role: 'authoritative',
      boundary: 'documentation',
    },
    {
      id: 'document-mount',
      root: 'document-mount',
      owner: 'skills',
      role: 'authoritative',
    },
    {
      id: 'runtime-mount',
      root: 'runtime-mount',
      owner: 'lynx-website',
      role: 'mounted',
      origins: [{ repository: 'fixture', root: 'src/components' }],
    },
  ];
  contracts.documentationCorpus = validateDocumentationCorpus(
    io.data,
    contracts.owners,
  );
  assert.deepEqual(
    discoverCorpus(io.cwd, contracts).map((r) => [r.importer, r.owner, r.kind]),
    [
      ['assembled/page.mdx', 'consumer', 'import'],
      ['generator.json', 'skills', 'configuration'],
      ['site.ts', 'consumer', 'import'],
      ['src/components/runtime.ts', 'lynx-website', 'import'],
    ],
  );
});

test('coverage, final hashes, annotations and parse errors fail closed', async (t) => {
  const io = fixture(t);
  const content = 'import { Value } from "@lynx";\n';
  io.output('assembled/page.mdx', content);
  const contracts = await loadContracts();
  const scan = (data: DocumentationCorpus = io.data) => {
    contracts.documentationCorpus = validateDocumentationCorpus(
      data,
      contracts.owners,
    );
    return discoverCorpus(io.cwd, contracts);
  };
  assert.equal(scan().length, 1);
  io.write('assembled/untracked.mdx', '# No imports');
  assert.throws(
    () => scan(),
    /untracked.mdx: prepared documentation has no ownership record/,
  );
  rmSync(path.join(io.cwd, 'assembled/untracked.mdx'));
  io.write('assembled/page.mdx', content + '\n');
  assert.throws(() => scan(), /page.mdx: stale documentation snapshot/);
  io.write('assembled/page.mdx', content);
  for (const file of ['assembled/page.mdx', 'assembled/empty.mdx']) {
    const modified = structuredClone(io.data);
    if (file.endsWith('empty.mdx')) {
      io.write(file, '');
      modified.files.push({
        file,
        owner: 'consumer',
        sha256: documentationDigest(''),
      });
    }
    modified.files[modified.files.length - 1] = {
      ...modified.files.at(-1)!,
      imports: [{ index: 1, specifier: '@lynx', owner: 'consumer' }],
    };
    assert.throws(() => scan(modified), /index 1 is outside the final syntax/);
    if (file.endsWith('empty.mdx')) rmSync(path.join(io.cwd, file));
  }
  rmSync(path.join(io.cwd, 'assembled/page.mdx'));
  assert.throws(
    () => scan(),
    /ownership record is outside the executable corpus/,
  );
  const invalid = 'import { from "@lynx";\n';
  io.write('assembled/page.mdx', invalid);
  assert.throws(
    () =>
      scan({
        ...io.data,
        files: [
          {
            ...io.data.files[0]!,
            sha256: documentationDigest(invalid),
          },
        ],
      }),
    /page.mdx:/,
  );
});

test('explicit final takeover overrides physical importer ownership', async (t) => {
  const io = fixture(t);
  io.data.roots = ['docs'];
  io.output('docs/local.mdx', 'import "@lynx";', 'consumer');
  execFileSync('git', ['add', 'docs/local.mdx'], { cwd: io.cwd });
  const contracts = await loadContracts();
  contracts.documentationScope = {
    roots: ['docs'],
    trackedSource: { id: 'tracked', owner: 'lynx-website' },
  };
  assert.equal(discoverCorpus(io.cwd, contracts)[0]!.owner, 'lynx-website');
  contracts.documentationCorpus = validateDocumentationCorpus(
    io.data,
    contracts.owners,
  );
  assert.equal(discoverCorpus(io.cwd, contracts)[0]!.owner, 'consumer');
  // Origins are metadata, not source-file inventories or authenticity proofs.
  io.data.files[0] = {
    ...io.data.files[0]!,
    origins: [{ repository: 'fixture/website', root: 'removed/source.mdx' }],
  };
  contracts.documentationCorpus = validateDocumentationCorpus(
    io.data,
    contracts.owners,
  );
  assert.equal(discoverCorpus(io.cwd, contracts)[0]!.owner, 'consumer');
});

test('scope and final ownership schemas reject invalid data and retired process records', async (t) => {
  const io = fixture(t);
  io.output('assembled/page.mdx', '# Page');
  const { owners } = await loadContracts();
  const scope = {
    roots: ['prepared', 'shared'],
    trackedSource: { id: 'tracked', owner: 'consumer' },
  };
  assert.deepEqual(validateDocumentationScope(scope, owners), scope);
  for (const value of [
    undefined,
    { roots: [] },
    { roots: ['../escape'] },
    { roots: ['docs/public'] },
    { roots: ['prepared', 'prepared/nested'] },
    { roots: ['prepared'], trackedSource: { owner: 'consumer' } },
    { roots: ['prepared'], trackedSource: { id: 'tracked', owner: 'unknown' } },
  ])
    assert.throws(
      () => validateDocumentationScope(value, owners),
      /Invalid documentationScope/,
    );
  const mutations: ((data: any) => void)[] = [
    (d) => {
      d.roots = ['assembled', 'assembled/nested'];
    },
    (d) => {
      d.roots = ['../assembled'];
    },
    (d) => {
      d.roots = ['assembled/*'];
    },
    (d) => {
      d.roots = ['docs/public'];
    },
    (d) => {
      d.files[0].owner = 'unknown';
    },
    (d) => {
      d.files[0].sha256 = 'invalid';
    },
    (d) => {
      d.files.push(d.files[0]);
    },
    (d) => {
      d.files[0].file = 'other/page.mdx';
    },
    (d) => {
      d.files[0].file = 'assembled/*.mdx';
    },
    (d) => {
      d.files[0].imports = {};
    },
    ...[-1, 0.5, 1].map((index) => (d: any) => {
      d.files[0].imports = [
        { index, specifier: '@lynx', owner: 'consumer' },
        { index, specifier: '@lynx', owner: 'skills' },
      ];
    }),
    ...[undefined, '', ' ', 1].map((specifier) => (d: any) => {
      d.files[0].imports = [{ index: 0, specifier, owner: 'consumer' }];
    }),
    (d) => {
      d.files[0].imports = [{ index: 0, specifier: '@lynx', owner: 'unknown' }];
    },
    (d) => {
      d.files[0].imports = [
        { index: 0, specifier: '@lynx', owner: 'consumer', origins: [{}] },
      ];
    },
    (d) => {
      d.files[0].origins = {};
    },
    ...[
      '../docs/**',
      '/docs/**',
      'C:docs/**',
      'docs\\**',
      'docs/**/',
      'docs/./**',
    ].map((root) => (d: any) => {
      d.files[0].origins = [{ repository: 'fixture/website', root }];
    }),
  ];
  for (const mutate of mutations) {
    const data = structuredClone(io.data);
    mutate(data);
    assert.throws(
      () => validateDocumentationCorpus(data, owners),
      /Invalid documentationCorpus/,
    );
  }
  for (const legacy of [
    { ...io.data, sources: [] },
    {
      ...io.data,
      files: [{ ...io.data.files[0], segments: [] }],
    },
  ])
    assert.throws(
      () => validateDocumentationCorpus(legacy, owners),
      /sources\/segments are retired/,
    );
  for (const root of ['docs/**', 'docs/*/guide/*.mdx']) {
    const data = structuredClone(io.data);
    data.files[0] = {
      ...data.files[0]!,
      origins: [{ repository: 'fixture/website', root }],
    };
    assert.deepEqual(validateDocumentationCorpus(data, owners), data);
  }
});

test('public resources stay excluded through canonical documentation mounts', (t) => {
  const io = fixture(t);
  io.write('docs/public/assets/resource.js', 'import "@private/resource";');
  symlinkSync('docs/public', path.join(io.cwd, 'public-mount'));
  symlinkSync('docs/public/assets', path.join(io.cwd, 'assets-mount'));
  for (const root of ['public-mount', 'assets-mount'])
    assert.throws(
      () =>
        preparedDocumentation(io.cwd, { roots: [root], files: [] }, canonical),
      /public resources are not documentation roots/,
    );
  symlinkSync('docs', path.join(io.cwd, 'docs-mount'));
  symlinkSync('public', path.join(io.cwd, 'docs/resource-mount'));
  assert.equal(
    preparedDocumentation(
      io.cwd,
      { roots: ['docs-mount'], files: [] },
      canonical,
    ).size,
    0,
  );
  assert.throws(
    () =>
      preparedDocumentation(
        io.cwd,
        {
          roots: ['docs-mount'],
          files: [
            {
              file: 'docs-mount/public/assets/resource.js',
              owner: 'consumer',
              sha256: documentationDigest('import "@private/resource";'),
            },
          ],
        },
        canonical,
      ),
    /ownership record is outside the executable corpus/,
  );
});

test('canonical mounts cannot relabel runtime or duplicate prepared files', async (t) => {
  const io = fixture(t);
  io.output('assembled/page.mdx', '# Page');
  const contracts = await loadContracts();
  const scan = (data: DocumentationCorpus) => {
    contracts.documentationCorpus = validateDocumentationCorpus(
      data,
      contracts.owners,
    );
    return discoverCorpus(io.cwd, contracts);
  };
  symlinkSync('assembled', path.join(io.cwd, 'second'));
  assert.throws(
    () => scan({ ...io.data, roots: ['assembled', 'second'] }),
    /canonical documentation roots/,
  );
  symlinkSync('page.mdx', path.join(io.cwd, 'assembled/mount.mdx'));
  const duplicate = {
    ...io.data,
    files: [
      ...io.data.files,
      {
        ...io.data.files[0]!,
        file: 'assembled/mount.mdx',
        owner: 'consumer' as const,
      },
    ],
  };
  assert.throws(() => scan(duplicate), /conflicting canonical prepared files/);
  rmSync(path.join(io.cwd, 'assembled/mount.mdx'));
  io.write('src/components/runtime.ts', 'export const value = 1;');
  symlinkSync('src/components', path.join(io.cwd, 'runtime-docs'));
  assert.throws(
    () => scan({ ...io.data, roots: ['runtime-docs'], files: [] }),
    /overlaps runtime/,
  );
  io.write('outside/page.mdx', '# Page');
  symlinkSync('../outside', path.join(io.cwd, 'assembled/escape'));
  assert.throws(() => scan(io.data), /escapes its root/);
  rmSync(path.join(io.cwd, 'assembled/escape'));
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'consumer-runtime',
      root: 'assembled/private',
      owner: 'consumer',
      role: 'authoritative',
      boundary: 'runtime',
    },
  ];
  assert.throws(() => scan(io.data), /overlaps runtime/);
});

test('canonical runtime overlap remains forbidden without registered source areas', async (t) => {
  const io = fixture(t);
  io.output('assembled/page.mdx', 'import "@lynx";', 'consumer');
  const mount = path.join(io.cwd, 'cwd-mount');
  symlinkSync('.', mount);
  for (const file of ['src/runtime/value.ts', 'theme/missing.ts'])
    assert.equal(portableBoundary(file, mount, []), 'runtime');
  io.write('physical/.keep', '');
  renameSync(
    path.join(io.cwd, 'assembled'),
    path.join(io.cwd, 'physical/local'),
  );
  symlinkSync('physical/local', path.join(io.cwd, 'assembled'));
  io.write('physical/local/nested/.keep', '');
  const contracts = await loadContracts();
  contracts.documentationCorpus = io.data;
  for (const target of ['physical', 'physical/local/nested']) {
    symlinkSync(target, path.join(io.cwd, 'src'));
    assert.throws(
      () => portableBoundary('assembled/page.mdx', mount, [], io.data.roots),
      /overlaps runtime/,
    );
    assert.throws(() => discoverCorpus(io.cwd, contracts), /overlaps runtime/);
    unlinkSync(path.join(io.cwd, 'src'));
  }
});

test('final importer ownership grants neither migration allowances nor target access', async (t) => {
  const io = fixture(t);
  io.output(
    'assembled/page.mdx',
    'import { Value } from "@/private";\n',
    'consumer',
  );
  io.write('src/components/private.ts', 'export const Value = 1;');
  io.write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        moduleResolution: 'bundler',
        module: 'esnext',
        paths: { '@/*': ['src/components/*'] },
      },
    }),
  );
  const contracts = await loadContracts();
  contracts.documentationCorpus = validateDocumentationCorpus(
    io.data,
    contracts.owners,
  );
  const corpus = discoverCorpus(io.cwd, contracts);
  const runtime: Runtime = {
    explicitAliases: {},
    environments: [
      {
        name: 'web',
        aliases: { '@': path.join(io.cwd, 'src') },
        resolve: async () => path.join(io.cwd, 'src/components/private.ts'),
      },
    ],
    close: async () => {},
  };
  const violations = await checkImportPolicy(
    io.cwd,
    contracts,
    corpus,
    runtime,
  );
  assert.ok(violations.some((v) => v.rule === 'cross-owner-private'));
  assert.ok(violations.every((v) => !v.baselinable));
  assert.ok(
    compareBaseline(violations, [
      {
        rule: 'cross-owner-private',
        file: 'assembled/page.mdx',
        specifier: '@/private',
        count: 1,
      },
    ]).length,
  );
  runtime.environments[0]!.resolve = async () =>
    path.join(io.cwd, 'assembled/page.mdx');
  const target = await checkImportPolicy(
    io.cwd,
    contracts,
    [{ ...corpus[0]!, specifier: '@lynx' }],
    runtime,
  );
  assert.ok(
    target.some((v) => v.rule === 'target-policy' && v.targetOwner === null),
  );
});
