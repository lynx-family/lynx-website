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
  parseImports,
  producerAreas,
} from './corpus.js';
import { loadContracts } from './check-registry.js';
import type { SourceArea } from './types.js';

mkdirSync(path.join(process.cwd(), 'node_modules/.cache'), { recursive: true });

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

test('stylesheet module configuration strings are not import requests', async () => {
  const { aliases } = await loadContracts();
  for (const directive of ['use', 'forward']) {
    assert.deepEqual(
      parseImports(
        'entry.scss',
        `@${directive} "./tokens" with ($label: "@lynx/not-a-module");`,
        aliases,
      ),
      [],
    );
    assert.throws(
      () =>
        parseImports(
          'entry.scss',
          `@${directive} "@lynx/tokens" with ($label: "./local");`,
          aliases,
        ),
      /unsupported alias-bearing stylesheet/,
    );
  }
  // Every comma-separated @import request still participates.
  assert.throws(
    () =>
      parseImports('entry.scss', '@import "./local", "@lynx/tokens";', aliases),
    /unsupported alias-bearing stylesheet/,
  );
});

test('stylesheet corpus extracts static alias URLs without evaluating other strings', () => {
  const records = parseImports(
    'entry.scss',
    `
/* url('@ignored/a.svg') */
.icon { background: url("@assets/icon.svg"); }
`,
  );
  assert.deepEqual(
    records.map((record) => record.specifier),
    ['@assets/icon.svg'],
  );
  assert.throws(
    () => parseImports('entry.scss', `@use '@entry/#{name}';`),
    /unsupported alias-bearing/,
  );
  assert.deepEqual(
    parseImports('entry.css', `.text { content: "url('@ignored/example')"; }`),
    [],
  );
  // General stylesheet validity is delegated to the site's build pipeline.
});

test('stylesheet corpus recognizes mixed-case URLs and rejects alias module directives', () => {
  assert.deepEqual(
    parseImports(
      'entry.css',
      `.icon { background: UrL("@assets/icon.svg"); }`,
    ).map((record) => [record.specifier, record.kind]),
    [['@assets/icon.svg', 'style-url']],
  );
  for (const directive of ['import', 'use', 'forward'])
    assert.throws(
      () => parseImports('entry.scss', `@${directive} "@entry/tokens";`),
      /unsupported alias-bearing stylesheet/,
    );
});

test('stylesheet URLs preserve multiline whitespace and quoted parentheses', () => {
  assert.deepEqual(
    parseImports(
      'entry.css',
      `.icon { background: url(
  "@assets/icon.svg"
); }
.other { background: url("@assets/icons/circle(1).svg"); }
.text { content: "url('@ignored/icon(1).svg')"; }`,
    ).map((record) => [record.specifier, record.kind]),
    [
      ['@assets/icon.svg', 'style-url'],
      ['@assets/icons/circle(1).svg', 'style-url'],
    ],
  );
});

test('stylesheet corpus explicitly rejects alias syntax outside its static subset', async () => {
  for (const [file, content] of [
    ['entry.sass', '@use "@entry/tokens"\n@use "@entry/other"'],
    ['entry.less', '@import "@entry/tokens";'],
    [
      'entry.css',
      String.raw`.icon { background: url("\40 assets/icon.svg"); }`,
    ],
    ['entry.scss', '@use "@entry/" + $name;'],
    ['entry.scss', '.icon { background: url("@entry/" + $name); }'],
  ])
    assert.throws(
      () => parseImports(file!, content!),
      /unsupported alias-bearing stylesheet/,
      `${file}: ${content}`,
    );
  assert.deepEqual(
    parseImports(
      'entry.scss',
      '.icon { background: url("./icons/" + $name); }',
    ).map((record) => record.specifier),
    [],
  );
  const { aliases } = await loadContracts();
  assert.deepEqual(
    parseImports('entry.scss', '@use "~@mdn/minimalist/sass/utils";', aliases),
    [],
  );
  assert.throws(
    () => parseImports('entry.scss', '@use "@lynx/tokens";', aliases),
    /unsupported alias-bearing stylesheet/,
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
  write('src/components/entry.ts', "export { Value } from '@lynx';");
  write('docs/fr/guide.mdx', "import { Value } from '@lynx';");
  write('docs/fr/generated/fresh/page.mdx', "import { Value } from '@lynx';");
  const manifest = {
    sections: [
      { route: 'generated/fresh', content: { fr: 'content/fr/fresh' } },
    ],
  };
  symlinkSync(path.join(cwd, 'src/components'), path.join(cwd, 'mount'));
  contracts.sourceAreas = [
    ...contracts.sourceAreas,
    {
      id: 'same-mount',
      root: 'mount',
      owner: 'lynx-website',
      role: 'mounted',
      origins: [{ repository: 'fixture', root: 'src/components' }],
    },
  ];
  const corpus = discoverCorpus(cwd, contracts, manifest);
  assert.equal(corpus.length, 3);
  assert.deepEqual(
    corpus.map((record) => record.owner),
    ['lynx-stack', 'lynx-website', 'lynx-website'],
  );
  assert.deepEqual(discoverCorpus(cwd, contracts, manifest), corpus);
  write('docs/fr/generated/fresh/broken.mdx', 'import { from "@lynx";');
  assert.throws(() => discoverCorpus(cwd, contracts, manifest));
});

test('producer destinations and ownership are derived from manifest data', () => {
  const areas = producerAreas({
    sections: [
      { route: 'generated/new-section', content: { fr: 'content/fr/new' } },
    ],
  });
  assert.equal(areas[0]?.root, 'docs/fr/generated/new-section');
  assert.equal(areas[0]?.owner, 'lynx-stack');
  assert.throws(
    () =>
      producerAreas({
        sections: [{ route: '../escape', content: { en: 'content/en' } }],
      }),
    /Invalid/,
  );
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
  write('src/site.ts', "import { Value } from '@lynx';");
  assert.throws(
    () => discoverCorpus(cwd, contracts),
    /src\/site.ts: alias importer has no source area/,
  );
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
