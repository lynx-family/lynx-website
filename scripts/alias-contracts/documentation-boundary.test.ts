import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { findSourceBoundaryImports } from '../ci/check-doc-import-boundaries.mjs';
import {
  documentationBoundaryFixtures,
  invalidDocumentationFixtures,
} from '../ci/doc-import-boundary-fixtures.mjs';
import { checkImportPolicy, compareBaseline } from './check-import-policy.js';
import { loadContracts } from './check-registry.js';
import { discoverCorpus, parseImports, type ImportRecord } from './corpus.js';
import { findDocumentationBoundaryImports } from './boundary.js';
import type { Runtime } from './runtime.js';

const occurrences = (
  entries: readonly { file: string; line: number; specifier: string }[],
) =>
  entries
    .map(({ file, line, specifier }) => ({ file, line, specifier }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'),
    );

// Missing generated targets model an install with lifecycle scripts disabled.
// Three environments must still produce only one finding per syntax occurrence.
const unresolvedRuntime: Runtime = {
  explicitAliases: {},
  environments: ['web', 'node', 'node_md'].map((name) => ({
    name,
    aliases: {},
    resolve: async () => undefined,
  })),
  close: async () => {},
};

const documentRecords = (file: string, content: string): ImportRecord[] =>
  parseImports(file, content).map((record) => ({
    ...record,
    importer: file,
    sourceArea: 'website-locale-docs',
    owner: 'lynx-website',
    role: 'authoritative',
    boundary: 'documentation',
  }));

test('Gate 3 preserves frozen Documentation Imports acceptance', async (t) => {
  mkdirSync(path.join(process.cwd(), 'node_modules/.cache'), {
    recursive: true,
  });
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/boundary-parity-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(path.join(cwd, 'tsconfig.json'), '{}');
  const contracts = await loadContracts();
  for (const fixture of documentationBoundaryFixtures)
    await t.test(fixture.name, async () => {
      const entry = occurrences(
        findSourceBoundaryImports(fixture.file, fixture.content),
      );
      assert.deepEqual(
        entry,
        occurrences(fixture.expected),
        'frozen acceptance',
      );
      const findings = await checkImportPolicy(
        cwd,
        contracts,
        documentRecords(fixture.file, fixture.content),
        unresolvedRuntime,
      );
      const boundary = findings.filter(
        (finding) => finding.rule === 'relative-boundary',
      );
      assert.deepEqual(occurrences(boundary), entry, 'Gate 3 parity');
      assert.ok(boundary.every((finding) => !finding.baselinable));
      assert.equal(compareBaseline(boundary, []).length, 0);
      // compareBaseline manages migration debt only; the CLI separately rejects
      // every non-baselinable finding. No baseline can admit this rule.
      assert.throws(() =>
        compareBaseline(boundary, [
          {
            rule: 'relative-boundary',
            file: fixture.file,
            specifier: './forbidden',
            count: 1,
          },
        ]),
      );
    });
  for (const fixture of invalidDocumentationFixtures)
    await t.test(fixture.name, () => {
      const onError = (error: unknown) => {
        assert.equal((error as { line: number }).line, fixture.line);
        return true;
      };
      assert.throws(
        () => findSourceBoundaryImports(fixture.file, fixture.content),
        onError,
      );
      assert.throws(
        () => documentRecords(fixture.file, fixture.content),
        onError,
      );
    });
});

test('the documentation entry also rejects Gate 3 literal CommonJS boundary imports', async () => {
  const importer = 'docs/en/page.mdx';
  const content = "export const lazy = () => require('../../src/missing.ts');";
  assert.deepEqual(occurrences(findSourceBoundaryImports(importer, content)), [
    { file: importer, line: 1, specifier: '../../src/missing.ts' },
  ]);
});

test('portable relative boundaries retain lexical and physical evidence', async (t) => {
  mkdirSync(path.join(process.cwd(), 'node_modules/.cache'), {
    recursive: true,
  });
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/boundary-paths-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const write = (file: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), '');
  };
  writeFileSync(path.join(cwd, 'tsconfig.json'), '{}');
  for (const file of [
    'docs/en/local.ts',
    'src/components/existing.ts',
    'content/page.mdx',
    'implementation/entry.ts',
  ])
    write(file);
  symlinkSync('../../src', path.join(cwd, 'docs/en/runtime'));
  symlinkSync('../../theme', path.join(cwd, 'docs/en/unprepared-runtime'));
  symlinkSync('cycle', path.join(cwd, 'docs/en/cycle'));
  symlinkSync('../../docs/en', path.join(cwd, 'src/components/documents'));
  symlinkSync('../implementation', path.join(cwd, 'content/runtime'));
  symlinkSync('implementation', path.join(cwd, 'mounted-runtime'));
  const contracts = await loadContracts();
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'consumer-content',
      root: 'content',
      owner: 'consumer',
      role: 'authoritative',
      boundary: 'documentation',
    },
    {
      id: 'consumer-runtime',
      root: 'mounted-runtime',
      owner: 'consumer',
      role: 'mounted',
      boundary: 'runtime',
      origins: [{ repository: 'fixture', root: 'implementation' }],
    },
  ];
  const cases = [
    {
      file: 'docs/en/page.mdx',
      specifier: './runtime/components/missing.ts?raw',
      count: 1,
    },
    {
      file: 'docs/en/page.mdx',
      specifier: './unprepared-runtime/missing.ts?raw',
      count: 1,
    },
    {
      file: 'docs/en/page.mdx',
      specifier: './runtime/components/existing.ts#example',
      count: 1,
    },
    { file: 'docs/en/page.mdx', specifier: './local.ts?raw#example', count: 0 },
    {
      file: 'docs/en/page.mdx',
      specifier: '../../src/components/documents/local.ts',
      count: 1,
    },
    // A resolver redirection cannot waive the old lexical boundary.
    {
      file: 'docs/en/page.mdx',
      specifier: '../../theme/missing.ts?raw',
      count: 1,
      resolved: 'docs/en/local.ts',
    },
    {
      file: 'docs/en/page.mdx',
      specifier: './local',
      count: 1,
      resolved: 'src/components/existing.ts?raw#example',
    },
    {
      file: 'docs/en/page.mdx',
      specifier: './local',
      count: 1,
      resolved: 'src/components/existing.ts#example',
    },
    {
      file: 'content/page.mdx',
      specifier: './runtime/missing.ts?raw',
      count: 1,
    },
    {
      file: 'content/page.mdx',
      specifier: '../implementation/missing/deep.ts#example',
      count: 1,
    },
    { file: 'content/page.mdx', specifier: '../mounted-runtime', count: 1 },
    {
      file: 'implementation/entry.ts',
      specifier: '../content/missing.mdx#example',
      count: 1,
      boundary: 'runtime' as const,
    },
    { file: 'content/page.mdx', specifier: './missing.mdx?raw', count: 0 },
    {
      file: 'content/page.mdx',
      specifier: '../implementation-extra/entry.ts',
      count: 0,
    },
  ];
  for (const fixture of cases)
    await t.test(
      `${fixture.file}: ${fixture.specifier} -> ${fixture.resolved ?? 'unresolved'}`,
      async () => {
        const runtime: Runtime = {
          ...unresolvedRuntime,
          environments: unresolvedRuntime.environments.map((environment) => ({
            ...environment,
            resolve: async () =>
              fixture.resolved ? path.join(cwd, fixture.resolved) : undefined,
          })),
        };
        const record: ImportRecord = {
          importer: fixture.file,
          sourceArea: 'fixture',
          owner: 'consumer',
          boundary: fixture.boundary ?? 'documentation',
          role: 'authoritative',
          specifier: fixture.specifier,
          kind: 'import',
          line: 7,
          bindings: [],
        };
        const boundary = (
          await checkImportPolicy(cwd, contracts, [record], runtime)
        ).filter((finding) => finding.rule === 'relative-boundary');
        assert.equal(boundary.length, fixture.count);
        if (fixture.count)
          assert.deepEqual(occurrences(boundary), [
            {
              file: fixture.file,
              line: 7,
              specifier: fixture.specifier,
            },
          ]);
      },
    );
  await t.test('cyclic links fail instead of silently passing', async () => {
    await assert.rejects(
      checkImportPolicy(
        cwd,
        contracts,
        documentRecords(
          'docs/en/page.mdx',
          "import X from './cycle/missing.ts';",
        ),
        unresolvedRuntime,
      ),
      /ELOOP|Cyclic source symlink/,
    );
  });
});

test('discovered documentation mounts retain policy and canonical ownership once', async (t) => {
  for (const layout of [
    'file',
    'directory',
    'earlier-runtime-mount',
  ] as const) {
    await t.test(layout, async () => {
      const cwd = mkdtempSync(
        path.join(process.cwd(), 'node_modules/.cache/boundary-mounts-'),
      );
      t.after(() => rmSync(cwd, { recursive: true, force: true }));
      execFileSync('git', ['init', '--quiet', cwd]);
      const write = (file: string, content: string) => {
        mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
        writeFileSync(path.join(cwd, file), content);
      };
      write('tsconfig.json', '{}');
      const content = `import '../../src/components/missing.ts?raw#fragment';
import '@/private';
import '@assets/icon.svg';`;
      write('src/components/page.mdx', content);
      mkdirSync(path.join(cwd, 'docs/en'), { recursive: true });
      if (layout === 'file')
        symlinkSync(
          '../../src/components/page.mdx',
          path.join(cwd, 'docs/en/page.mdx'),
        );
      else {
        rmSync(path.join(cwd, 'docs/en'), { recursive: true });
        symlinkSync('../src/components', path.join(cwd, 'docs/en'));
      }
      const contracts = await loadContracts();
      if (layout === 'earlier-runtime-mount') {
        symlinkSync('src/components', path.join(cwd, 'aaa-runtime'));
        contracts.sourceAreas = [
          ...contracts.sourceAreas,
          {
            id: 'earlier-runtime',
            root: 'aaa-runtime',
            owner: 'lynx-website',
            role: 'mounted',
            boundary: 'runtime',
            origins: [{ repository: 'fixture', root: 'src/components' }],
          },
        ];
      }
      contracts.documentationScope = { roots: ['docs'] };
      const corpus = discoverCorpus(cwd, contracts);
      assert.equal(
        corpus.length,
        3,
        'one physical syntax occurrence per import',
      );
      assert.ok(corpus.every((record) => record.owner === 'lynx-website'));
      assert.ok(corpus.every((record) => record.boundary === 'runtime'));
      const findings = await checkImportPolicy(
        cwd,
        contracts,
        corpus,
        unresolvedRuntime,
      );
      const boundary = findings.filter(
        (entry) => entry.rule === 'relative-boundary',
      );
      const adapter = findDocumentationBoundaryImports(
        cwd,
        'docs/en/page.mdx',
        content,
      );
      assert.deepEqual(occurrences(boundary), occurrences(adapter));
      for (const rule of ['document-private', 'document-assets'])
        assert.equal(
          findings.filter((entry) => entry.rule === rule).length,
          1,
          rule,
        );
      assert.ok(boundary.every((entry) => !entry.baselinable));
      write('sharedDocs/local.mdx', '# Local');
      const redirected: Runtime = {
        ...unresolvedRuntime,
        environments: unresolvedRuntime.environments.map((environment) => ({
          ...environment,
          resolve: async () => path.join(cwd, 'sharedDocs/local.mdx'),
        })),
      };
      assert.equal(
        (
          await checkImportPolicy(
            cwd,
            contracts,
            [{ ...corpus[0]!, specifier: './local.mdx' }],
            redirected,
          )
        ).filter((entry) => entry.rule === 'relative-boundary').length,
        1,
        'the canonical runtime boundary also remains enforced',
      );
    });
  }
});
