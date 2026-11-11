import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  classifySource,
  discoverCorpus,
  matchingAlias,
  parseImports,
  resolvedResource,
} from './corpus.js';
import { loadContracts } from './check-registry.js';
import { manifestSourceAreas } from './oss-manifest-source-areas.js';
import type { SourceArea } from './types.js';

mkdirSync(path.join(process.cwd(), 'node_modules/.cache'), { recursive: true });

test('resolved resources strip only the exact originating request suffix', () => {
  for (const root of ['/checkout/C#/src', '/checkout/C?/src']) {
    const file = `${root}/entry.ts`;
    for (const suffix of [
      '',
      '?raw',
      '#fragment',
      '?raw#fragment',
      '#fragment?raw',
    ]) {
      assert.equal(
        resolvedResource(`@luna${suffix}`, `${file}${suffix}`),
        file,
      );
      assert.equal(resolvedResource(`@luna${suffix}`, file), file);
    }
    assert.equal(
      resolvedResource('@luna?raw', `${file}#fragment`),
      `${file}#fragment`,
    );
    assert.equal(
      resolvedResource('@luna#fragment', `${file}?raw#other`),
      `${file}?raw#other`,
    );
    assert.equal(
      resolvedResource('@luna', `${file}#fragment`),
      `${file}#fragment`,
    );
  }
});

test('alias matching uses resource paths and keeps namespace boundaries', async () => {
  const { aliases } = await loadContracts();
  for (const modifier of [
    '',
    '?raw',
    '#fragment',
    '?raw#fragment',
    '#fragment?raw',
  ]) {
    for (const [request, expected] of [
      ['@luna', 'luna'],
      ['@luna/child', 'luna'],
      ['@theme/child.tsx', 'theme'],
      ['@lynx-ui/child', 'lynx-ui'],
      ['@luna-other', undefined],
    ] as const) {
      const plain = matchingAlias(request, aliases);
      assert.equal(
        matchingAlias(`${request}${modifier}`, aliases)?.id,
        plain?.id,
        `${request}${modifier}`,
      );
      assert.equal(!!plain, expected !== undefined);
    }
  }
});

test('script corpus preserves raw spelling, type imports, re-exports and dynamic imports', () => {
  const records = parseImports(
    'entry.ts',
    `
import type { Shape } from '@entry/types.ts';
import { type Other, Value as Local } from '@entry/index';
import Default from '@entry';
import '@entry/side';
export type { Shape } from '@entry/types';
export * from '@entry/all';
const lazy = import('@entry/lazy');
const computed = import(variable);
`,
  );
  assert.deepEqual(
    records.map((record) => record.specifier),
    [
      '@entry/types.ts',
      '@entry/index',
      '@entry',
      '@entry/side',
      '@entry/types',
      '@entry/all',
      '@entry/lazy',
    ],
  );
  assert.deepEqual(records[1]?.bindings, [
    { name: 'Other', typeOnly: true },
    { name: 'Value', typeOnly: false },
  ]);
  assert.equal(records[4]?.bindings[0]?.typeOnly, true);
  assert.equal(records[6]?.kind, 'dynamic');
});

test('script corpus preserves static import and re-export attributes', () => {
  const records = parseImports(
    'entry.mts',
    `import data from '@entry/data.json' with { type: 'json' };
import '@entry/data.json' with { type: 'json' };
export { default as data } from '@entry/data.json' with { type: 'json' };
export * from '@entry/data.json' with { type: 'json' };
import legacy from '@entry/legacy.json' assert { type: 'json' };
import plain from '@entry/plain';`,
  );
  assert.deepEqual(
    records.map((record) => record.attributes),
    [
      "with { type: 'json' }",
      "with { type: 'json' }",
      "with { type: 'json' }",
      "with { type: 'json' }",
      "assert { type: 'json' }",
      undefined,
    ],
  );
  assert.deepEqual(
    records.map((record) => record.line),
    [1, 2, 3, 4, 5, 6],
  );
});

test('MDX syntax agrees with Rspress and ignores frontmatter, prose and fenced examples', () => {
  const content = `---
title: Imports
---
# Heading {#stable-id}

import Default, { Value as Local } from '@entry/index.ts';

\`\`\`tsx
import Ignored from '@example';
\`\`\`

<Component load={() => import('@entry/lazy')} />
{import(\`@entry/template\`)}
`;
  assert.deepEqual(
    parseImports('page.mdx', content).map((record) => [
      record.specifier,
      record.line,
    ]),
    [
      ['@entry/index.ts', 6],
      ['@entry/lazy', 12],
      ['@entry/template', 13],
    ],
  );
  assert.deepEqual(parseImports('page.md', content), []);
  assert.throws(() => parseImports('broken.mdx', 'import { from "@entry";'));
  assert.throws(() => parseImports('broken.ts', 'import { from "@entry";'));
});

test('script corpus includes literal import types and their top-level qualifiers', () => {
  assert.deepEqual(
    parseImports(
      'entry.ts',
      `
type Shape = import('@/types').Shape;
type Nested = import('@/types').Namespace.Shape;
type Module = typeof import('@/types');
type Computed = import(variable);
`,
    ).map((record) => [record.specifier, record.kind, record.bindings]),
    [
      ['@/types', 'import', [{ name: 'Shape', typeOnly: true }]],
      ['@/types', 'import', [{ name: 'Namespace', typeOnly: true }]],
      ['@/types', 'import', [{ name: '*', typeOnly: true }]],
    ],
  );
});

test('script and MDX corpus distinguish ordinary star re-exports from namespaces', () => {
  for (const file of ['entry.ts', 'entry.mdx']) {
    assert.deepEqual(
      parseImports(
        file,
        `export * from '@entry';
export * as Namespace from '@entry';
import * as NamespaceImport from '@entry';`,
      ).map((record) => record.kind),
      ['export-star', 'export', 'import'],
    );
  }
});

test('script corpus retains external import-equals and erased bindings', () => {
  assert.deepEqual(
    parseImports(
      'entry.mts',
      `import Local = require('@/private');
import type Shape = require('@/types');
import Internal = Local.Member;`,
    ).map((record) => [record.specifier, record.kind, record.bindings]),
    [
      ['@/private', 'require', [{ name: '*', typeOnly: false }]],
      ['@/types', 'require', [{ name: '*', typeOnly: true }]],
    ],
  );
});

test('script corpus records literal CommonJS requests without evaluating calls', () => {
  assert.deepEqual(
    parseImports(
      'entry.cjs',
      `const value = require('@/private');
const computed = require(variable);`,
    ).map((record) => [record.specifier, record.kind]),
    [['@/private', 'require']],
  );
});

test('MDX records literal CommonJS calls in ESM, JSX and expressions only', () => {
  const content = `export const value = require('@/private');

<Component load={() => require(\`@/template\`)} />
{require('@/expression')}
{require(variable)}
{loader.require('@/member')}

\`\`\`js
require('@/example');
\`\`\`
`;
  assert.deepEqual(
    parseImports('entry.mdx', content).map((record) => [
      record.specifier,
      record.kind,
      record.line,
    ]),
    [
      ['@/private', 'require', 1],
      ['@/template', 'require', 3],
      ['@/expression', 'require', 4],
    ],
  );
  assert.deepEqual(parseImports('entry.md', content), []);
});

test('script and MDX string-named re-exports preserve the imported name', () => {
  for (const file of ['entry.ts', 'entry.mdx'])
    assert.deepEqual(
      parseImports(file, 'export { "Value" as Renamed } from "@entry";')[0]
        ?.bindings,
      [{ name: 'Value', typeOnly: false }],
    );
});

test('discovery excludes stylesheet contents but retains JS/TS/MDX imports of styles and assets', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };
  execFileSync('git', ['init', '--quiet', cwd]);
  for (const [file, content] of [
    ['tracked.css', '.icon { background: url("@assets/icon.svg"); }'],
    ['theme/entry.scss', '@use "@lynx/tokens";'],
    ['src/components/entry.sass', '@use "@lynx/tokens"\n@use "@lynx/other"'],
    ['src/components/entry.less', '@import "@lynx/tokens";\n.invalid {'],
  ]) {
    write(file!, content!);
    assert.deepEqual(parseImports(file!, content!), []);
  }
  execFileSync('git', ['add', 'tracked.css'], { cwd });
  const content = "import '@theme/entry.scss';\nimport '@assets/icon.svg';";
  for (const extension of ['js', 'ts', 'mdx'])
    write(`src/components/imports.${extension}`, content);
  const corpus = discoverCorpus(cwd, await loadContracts());
  assert.deepEqual(
    corpus.map(({ importer, specifier, kind }) => [importer, specifier, kind]),
    ['js', 'mdx', 'ts'].flatMap((extension) => [
      [`src/components/imports.${extension}`, '@theme/entry.scss', 'import'],
      [`src/components/imports.${extension}`, '@assets/icon.svg', 'import'],
    ]),
  );
});

test('discovery includes generated locales, deduplicates mounts and fails on parse errors', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };
  execFileSync('git', ['init', '--quiet', cwd]);
  write('package.json', '{"type":"module"}');
  const contracts = await loadContracts();
  contracts.documentationScope = {
    roots: ['docs', 'sharedDocs'],
    trackedSource: { id: 'tracked-docs', owner: 'lynx-website' },
  };
  mkdirSync(path.join(cwd, 'sharedDocs'));
  write('src/components/entry.ts', "export { Value } from '@lynx';");
  write('docs/fr/guide.mdx', "import { Value } from '@lynx';");
  execFileSync('git', ['add', 'docs/fr/guide.mdx'], { cwd });
  write('docs/fr/generated/fresh/page.mdx', "import { Value } from '@lynx';");
  symlinkSync(path.join(cwd, 'src/components'), path.join(cwd, 'mount'));
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'generated-docs',
      root: 'docs/fr/generated/fresh',
      owner: 'lynx-stack',
      role: 'generated',
      boundary: 'documentation',
      origins: [{ repository: 'fixture', root: 'content/fr/fresh' }],
    },
    {
      id: 'same-mount',
      root: 'mount',
      owner: 'lynx-website',
      role: 'mounted',
      origins: [{ repository: 'fixture', root: 'src/components' }],
    },
  ];
  const corpus = discoverCorpus(cwd, contracts);
  assert.equal(corpus.length, 3);
  assert.deepEqual(
    corpus.map((record) => record.owner),
    ['lynx-stack', 'lynx-website', 'lynx-website'],
  );
  assert.deepEqual(discoverCorpus(cwd, contracts), corpus);
  write('docs/fr/generated/fresh/broken.mdx', 'import { from "@lynx";');
  assert.throws(() => discoverCorpus(cwd, contracts));
});

const manifestBinding = {
  owner: 'consumer' as const,
  repository: 'fixture',
  sourceRoot: 'package',
  outputRoot: 'prepared',
};

test('manifest conversion uses explicit binding and localized/shared destination data', () => {
  const areas = manifestSourceAreas(
    {
      sections: [{ route: 'guide', content: { fr: 'content/fr' } }],
      sharedContent: [{ source: 'content/shared', destination: '_shared' }],
    },
    manifestBinding,
  );
  assert.deepEqual(
    areas.map(({ root, owner, origins }) => ({ root, owner, origins })),
    [
      {
        root: 'prepared/fr/guide',
        owner: 'consumer',
        origins: [{ repository: 'fixture', root: 'package/content/fr' }],
      },
      {
        root: 'prepared/_shared',
        owner: 'consumer',
        origins: [{ repository: 'fixture', root: 'package/content/shared' }],
      },
    ],
  );
  assert.throws(
    () =>
      manifestSourceAreas(
        {
          sections: [{ route: '../escape', content: { en: 'content/en' } }],
        },
        manifestBinding,
      ),
    /Invalid/,
  );
});

test('complete scope rejects unowned documentation even without alias imports', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', cwd]);
  const contracts = await loadContracts();
  contracts.documentationScope = { roots: ['docs', 'sharedDocs'] };
  for (const root of contracts.documentationScope.roots)
    mkdirSync(path.join(cwd, root), { recursive: true });
  for (const [file, content] of [
    [
      'docs/en/unregistered/page.mdx',
      "import { Value } from 'ordinary-package';",
    ],
    ['docs/_support/Preview.tsx', "import React from 'react';"],
    ['sharedDocs/unregistered/empty.ts', 'export const value = 1;'],
    ['docs/en/unregistered/empty.md', '# No imports'],
  ]) {
    mkdirSync(path.dirname(path.join(cwd, file!)), { recursive: true });
    writeFileSync(path.join(cwd, file!), content!);
    assert.throws(
      () => discoverCorpus(cwd, contracts),
      /executable documentation has no source ownership/,
      file,
    );
    rmSync(path.join(cwd, file!));
  }
});

test('tracked site documentation and support modules retain authoritative ownership', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', cwd]);
  for (const file of [
    'docs/fr/page.mdx',
    'docs/_local/Preview.tsx',
    'sharedDocs/local.ts',
  ]) {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), "import React from 'react';");
    execFileSync('git', ['add', file], { cwd });
  }
  const contracts = await loadContracts();
  contracts.documentationScope = {
    roots: ['docs', 'sharedDocs'],
    trackedSource: { id: 'tracked-docs', owner: 'consumer' },
  };
  const corpus = discoverCorpus(cwd, contracts);
  assert.equal(corpus.length, 3);
  assert.ok(corpus.every((record) => record.owner === 'consumer'));
  assert.ok(corpus.every((record) => record.role === 'authoritative'));
  contracts.documentationScope = { roots: ['absent'] };
  assert.throws(
    () => discoverCorpus(cwd, contracts),
    /missing documentation root/,
  );
});

test('declared generated modules retain ownership and reject conflicting areas', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', cwd]);
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };
  write('prepared/page.mdx', "import { Preview } from './Preview';");
  write('prepared/Preview.tsx', "import React from 'react';");
  write('prepared/empty.ts', 'export const value = 1;');
  // Public resources remain excluded even when mounted under docs.
  write('docs/public/resource.ts', 'import { from "broken";');
  symlinkSync(
    path.join(cwd, 'docs/public'),
    path.join(cwd, 'prepared/public-mount'),
  );
  const contracts = await loadContracts();
  contracts.documentationScope = { roots: ['prepared'] };
  const area: SourceArea = {
    id: 'generated-modules',
    root: 'prepared',
    owner: 'consumer:tools-docs',
    role: 'generated',
    boundary: 'documentation',
    origins: [{ repository: 'fixture', root: 'content/shared' }],
  };
  assert.throws(() => discoverCorpus(cwd, contracts), /no source ownership/);
  contracts.sourceAreas = [...contracts.sourceAreas, area];
  const corpus = discoverCorpus(cwd, contracts);
  assert.equal(corpus.length, 2);
  assert.ok(corpus.every((record) => record.owner === area.owner));
  assert.ok(corpus.every((record) => record.role === 'generated'));
  assert.ok(
    corpus.every(
      (record) => record.documentation && record.boundary === 'documentation',
    ),
  );
  assert.deepEqual(corpus[0]?.origins, area.origins);
  // Documentation metadata cannot reclassify a physical runtime mount.
  write('src/local/index.ts', 'export const value = 1;');
  symlinkSync(path.join(cwd, 'src/local'), path.join(cwd, 'runtime-mount'));
  const documentationAreas = contracts.sourceAreas;
  for (const mounted of [false, true]) {
    if (mounted) {
      renameSync(path.join(cwd, 'src'), path.join(cwd, 'physical'));
      symlinkSync(path.join(cwd, 'physical'), path.join(cwd, 'src'));
    }
    for (const owner of ['consumer', 'consumer:tools-docs'] as const) {
      contracts.sourceAreas = [
        ...documentationAreas,
        {
          ...area,
          id: 'runtime-mount',
          root: 'runtime-mount',
          owner,
        },
      ];
      assert.throws(
        () => discoverCorpus(cwd, contracts),
        /documentation owner overlaps runtime/,
      );
    }
  }
  contracts.sourceAreas = documentationAreas;
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'wrong-owner',
      root: 'prepared',
      owner: 'consumer',
      role: 'authoritative',
    },
  ];
  assert.throws(
    () => discoverCorpus(cwd, contracts),
    /ambiguous source ownership/,
  );
});

test('producer manifests reject escaping, public and overlapping executable roots', () => {
  for (const manifest of [
    { sections: [{ route: 'guide', content: { public: 'content' } }] },
    { sections: [{ route: 'C:/escape', content: { en: 'content' } }] },
    {
      sections: [
        { route: 'guide', content: { en: 'content' } },
        { route: 'guide/nested', content: { en: 'other' } },
      ],
    },
    {
      sections: [],
      sharedContent: [{ source: '../escape', destination: '_shared' }],
    },
    {
      sections: [],
      sharedContent: [{ source: 'content', destination: 'public/escape' }],
    },
    {
      sections: [{ route: 'guide', content: { en: 'content' } }],
      sharedContent: [{ source: 'content', destination: 'en' }],
    },
  ]) {
    assert.throws(
      () =>
        manifestSourceAreas(
          { schemaVersion: 1, sharedContent: [], ...manifest },
          { ...manifestBinding, outputRoot: 'docs' },
        ),
      /Invalid documentation manifest/,
    );
  }
});

test('public exclusions reject overlapping standard and relocated runtime mounts', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', cwd]);
  mkdirSync(path.join(cwd, 'docs'), { recursive: true });
  const contracts = await loadContracts();
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'relocated-runtime',
      root: 'modules',
      owner: 'consumer',
      role: 'authoritative',
      boundary: 'runtime',
    },
  ];
  for (const root of ['src', 'theme', 'modules']) {
    mkdirSync(path.join(cwd, root), { recursive: true });
    writeFileSync(
      path.join(cwd, root, 'entry.ts'),
      "import { Value } from '@lynx';",
    );
    execFileSync('git', ['add', `${root}/entry.ts`], { cwd });
    for (const target of [root, '.']) {
      symlinkSync(path.join(cwd, target), path.join(cwd, 'docs/public'));
      assert.throws(
        () => discoverCorpus(cwd, contracts),
        /public resources overlap runtime/,
      );
      rmSync(path.join(cwd, 'docs/public'));
    }
  }
});

test('discovery follows working-tree deletions and renames before staging', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', cwd]);
  mkdirSync(path.join(cwd, 'src/components'), { recursive: true });
  for (const file of ['deleted.ts', 'original.ts', 'retained.ts'])
    writeFileSync(
      path.join(cwd, 'src/components', file),
      "export { Value } from '@lynx';",
    );
  execFileSync('git', ['add', 'src/components'], { cwd });
  const contracts = await loadContracts();
  assert.equal(discoverCorpus(cwd, contracts).length, 3);

  rmSync(path.join(cwd, 'src/components/deleted.ts'));
  renameSync(
    path.join(cwd, 'src/components/original.ts'),
    path.join(cwd, 'src/components/renamed.ts'),
  );
  assert.deepEqual(
    discoverCorpus(cwd, contracts).map((record) => record.importer),
    ['src/components/renamed.ts', 'src/components/retained.ts'],
  );
  writeFileSync(
    path.join(cwd, 'src/components/retained.ts'),
    'import { from "@lynx";',
  );
  assert.throws(
    () => discoverCorpus(cwd, contracts),
    /src\/components\/retained.ts:/,
  );
});

test('consumer discovery uses declared mounts without reading transitive producers or copied docs', async (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  };
  execFileSync('git', ['init', '--quiet', cwd]);
  write('package.json', '{"type":"module"}');
  const contracts = await loadContracts();
  write('src/components/entry.ts', "export { Value } from '@lynx';");
  write('theme/entry.ts', "export { Value } from '@theme';");
  // These copied docs are outside the consumer source map. They must not
  // trigger producer lookup, parse errors, or an implicit website-owner fallback.
  write('docs/fr/copied.mdx', 'import { from "@lynx";');
  write('sharedDocs/copied.mdx', 'import { from "@lynx";');
  execFileSync('git', ['add', 'docs/fr/copied.mdx', 'sharedDocs/copied.mdx'], {
    cwd,
  });
  write('copied-source/entry.ts', "export { Value } from '@lynx';");
  symlinkSync(path.join(cwd, 'copied-source'), path.join(cwd, 'mounted'));
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'consumer-mounted',
      root: 'mounted',
      owner: 'consumer',
      role: 'mounted',
      origins: [{ repository: 'fixture/consumer', root: 'copied-source' }],
    },
  ];
  const corpus = discoverCorpus(cwd, contracts);
  assert.deepEqual(
    corpus.map((record) => [record.importer, record.owner]),
    [
      ['mounted/entry.ts', 'consumer'],
      ['src/components/entry.ts', 'lynx-website'],
      ['theme/entry.ts', 'lynx-website'],
    ],
  );
  // Even an installed manifest (host-visible or nested) does not change scope.
  for (const root of [
    'node_modules/@lynx-js/lynx-stack-docs',
    'node_modules/fixture-doc/node_modules/@lynx-js/lynx-stack-docs',
  ])
    write(`${root}/manifest.json`, '{invalid');
  assert.deepEqual(discoverCorpus(cwd, contracts), corpus);
  for (const specifier of ['@lynx', '@luna?raw', '@luna#fragment']) {
    write('src/site.ts', `import { Value } from '${specifier}';`);
    assert.throws(
      () => discoverCorpus(cwd, contracts),
      /src\/site.ts: alias importer has no source area/,
    );
  }
  rmSync(path.join(cwd, 'src/site.ts'));
  // Caller-owned docs explicitly declared through the existing source map
  // remain in scope, as do their parse failures.
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'consumer-docs',
      root: 'docs/fr',
      owner: 'consumer',
      role: 'authoritative',
    },
  ];
  assert.throws(() => discoverCorpus(cwd, contracts), /copied.mdx/);
});

test('canonical targets retain ownership and ambiguous symlink mounts fail', (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  mkdirSync(path.join(cwd, 'oss'));
  writeFileSync(path.join(cwd, 'oss/entry.ts'), 'export const value = 1');
  symlinkSync(path.join(cwd, 'oss'), path.join(cwd, 'mount'));
  const areas: SourceArea[] = [
    {
      id: 'original',
      root: 'oss',
      owner: 'lynx-website',
      role: 'authoritative',
    },
    {
      id: 'copy',
      root: 'mount',
      owner: 'lynx-website',
      role: 'mounted',
      origins: [{ repository: 'fixture', root: 'oss' }],
    },
  ];
  assert.equal(
    classifySource('mount/entry.ts', cwd, areas)?.owner,
    'lynx-website',
  );
  areas[1] = { ...areas[1]!, owner: 'consumer' };
  assert.throws(
    () => classifySource('mount/entry.ts', cwd, areas),
    /ambiguous source ownership/,
  );
});

test('nested symlink escapes do not inherit physical source ownership', (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  mkdirSync(path.join(cwd, 'consumer/local'), { recursive: true });
  mkdirSync(path.join(cwd, 'undeclared'));
  writeFileSync(
    path.join(cwd, 'undeclared/child.ts'),
    'export const Value = 1;',
  );
  symlinkSync(
    path.join(cwd, 'undeclared'),
    path.join(cwd, 'consumer/local/escape'),
  );
  const areas: SourceArea[] = [
    {
      id: 'consumer-local',
      root: 'consumer/local',
      owner: 'consumer',
      role: 'authoritative',
    },
  ];
  assert.equal(
    classifySource('consumer/local/escape/child.ts', cwd, areas),
    undefined,
  );
});

test('source area precedence follows canonical root specificity and stable IDs', (t) => {
  const cwd = mkdtempSync(
    path.join(process.cwd(), 'node_modules/.cache/corpus-'),
  );
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  mkdirSync(path.join(cwd, 'physical/tokens'), { recursive: true });
  mkdirSync(path.join(cwd, 'extra'));
  writeFileSync(path.join(cwd, 'physical/tokens/entry.ts'), '');
  symlinkSync(path.join(cwd, 'physical/tokens'), path.join(cwd, 'local'));
  symlinkSync(path.join(cwd, 'physical'), path.join(cwd, 'extra/long-root'));
  const areas: SourceArea[] = [
    { id: 'nested', root: 'local', owner: 'consumer', role: 'authoritative' },
    {
      id: 'broad',
      root: 'extra/long-root',
      owner: 'consumer',
      role: 'authoritative',
    },
  ];
  assert.equal(classifySource('local/entry.ts', cwd, areas)?.id, 'nested');
  assert.equal(
    classifySource('physical/tokens/entry.ts', cwd, areas)?.id,
    'nested',
  );
  areas.push({ ...areas[0]!, id: 'a-nested' });
  assert.equal(classifySource('local/entry.ts', cwd, areas)?.id, 'a-nested');
});
