import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  findNewUnusedImports,
  findUnusedDocumentationImports,
} from './check-doc-unused-imports.mjs';

const file = 'docs/en/example.mdx';
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const names = (content) =>
  findUnusedDocumentationImports(file, content).map((binding) => binding.name);

test('reports default, named, renamed and namespace imports from any source', () => {
  assert.deepEqual(
    names(`
import Default, { Original as Local, _Unused } from 'framework/theme';
import * as Namespace from '@lynx';
import Fragment from './fragment.mdx';

Text
`),
    ['Default', 'Local', '_Unused', 'Namespace', 'Fragment'],
  );
});

test('counts JSX elements, namespace members, props, spreads and expressions', () => {
  assert.deepEqual(
    names(`
import Component, { Data, Props, Child } from 'pkg';
import * as Steps from '@lynx';

<Component value={Data} {...Props}><Child /></Component>
<Steps.Root><Steps.Step /></Steps.Root>
{Data.map(value => <Child key={value} />)}
`),
    [],
  );
});

test('counts exports, shorthand properties and computed property keys', () => {
  assert.deepEqual(
    names(`
import { Exported, DefaultExport, Shorthand, Key } from 'pkg';

export { Exported as Renamed };
export const data = { Shorthand, [Key]: true };
export default DefaultExport;
`),
    [],
  );
});

test('distinguishes object keys and shadowed function, block and catch bindings', () => {
  assert.deepEqual(
    names(`
import { Parameter, Block, Caught, Property, RealUse } from 'pkg';

export const fn = Parameter => ({ Property: Parameter });
export function scoped() {
  { const Block = 1; console.log(Block); }
  try { throw 1; } catch (Caught) { console.log(Caught); }
  return RealUse;
}
`),
    ['Parameter', 'Block', 'Caught', 'Property'],
  );
});

test('handles function parameter defaults separately from body declarations', () => {
  assert.deepEqual(
    names(`
import { InDefault, Shadowed } from 'pkg';

export function fn(Shadowed = InDefault) {
  const InDefault = Shadowed;
  return InDefault;
}
`),
    ['Shadowed'],
  );
});

test('does not count write-only assignments as usage', () => {
  assert.deepEqual(
    names(`
import { Written, Read } from 'pkg';

export function update() {
  Written = 1;
  Read += 1;
}
`),
    ['Written'],
  );
});

test('does not count strings, comments, code fences or lowercase JSX tags', () => {
  assert.deepEqual(
    names(`
import { Example, lowercase } from 'pkg';

export const text = 'Example';

{/* <Example /> */}

\`\`\`mdx
<Example />
import { Example } from 'pkg';
\`\`\`

<lowercase />
`),
    ['Example', 'lowercase'],
  );
});

test('allows side-effect imports and re-exports without local bindings', () => {
  assert.deepEqual(
    names(`
import 'pkg/styles';

export { Remote } from 'pkg';
export * from './fragment.mdx';
`),
    [],
  );
});

test('plain Markdown examples are not executable MDX', () => {
  assert.deepEqual(
    findUnusedDocumentationImports(
      'docs/en/example.md',
      "import Unused from 'pkg';\n\n<unclosed",
    ),
    [],
  );
});

test('preserves frontmatter and heading-ID source locations', () => {
  assert.deepEqual(
    findUnusedDocumentationImports(
      file,
      [
        '---',
        'title: Example',
        '---',
        '',
        "import { Unused, Used } from '@lynx';",
        '',
        '## Example {#example}',
        '',
        '<Used />',
      ].join('\n'),
    ),
    [{ file, line: 5, column: 10, name: 'Unused', source: '@lynx' }],
  );
});

test('never executes document code or resolves imported modules', () => {
  assert.deepEqual(
    names(`
import { Used } from '/missing/untrusted-module.js';

export const data = (() => { throw new Error('Must not execute'); })();

<Used />
`),
    [],
  );
});

test('malformed executable MDX fails rather than silently skipping imports', () => {
  assert.throws(() => names("import { Used } from 'pkg';\n\n<div"));
});

test('comparison permits existing debt but rejects new unused bindings', () => {
  const previous = findUnusedDocumentationImports(
    file,
    "import { Existing, Used } from 'pkg';\n\n<Used />",
  );
  const current = findUnusedDocumentationImports(
    file,
    "---\ntitle: Changed\n---\n\nimport { Existing, Used, Added } from 'pkg';\n\nText",
  );
  assert.deepEqual(
    findNewUnusedImports(current, previous).map((binding) => binding.name),
    ['Used', 'Added'],
  );
  assert.deepEqual(findNewUnusedImports([], previous), []);
});

test('comparison rejects copied files and imports from a new module', () => {
  const previous = findUnusedDocumentationImports(
    file,
    "import { Existing } from 'pkg';",
  );
  assert.equal(
    findNewUnusedImports(
      [{ ...previous[0], file: 'docs/zh/copy.mdx' }],
      previous,
    ).length,
    1,
  );
  assert.equal(
    findNewUnusedImports([{ ...previous[0], source: 'other-pkg' }], previous)
      .length,
    1,
  );
});

function fixture(t) {
  const root = mkdtempSync(
    path.join(repoRoot, 'node_modules/.cache/doc-unused-imports-'),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'scripts/ci'), { recursive: true });
  mkdirSync(path.join(root, 'docs/en'), { recursive: true });
  mkdirSync(path.join(root, 'sharedDocs/introDocs'), { recursive: true });
  symlinkSync(
    path.join(repoRoot, 'node_modules'),
    path.join(root, 'node_modules'),
  );
  for (const script of [
    'check-doc-unused-imports.mjs',
    'documentation-parser.mjs',
  ]) {
    copyFileSync(
      path.join(repoRoot, 'scripts/ci', script),
      path.join(root, 'scripts/ci', script),
    );
  }
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Documentation tests',
        GIT_AUTHOR_EMAIL: 'tests@example.invalid',
        GIT_COMMITTER_NAME: 'Documentation tests',
        GIT_COMMITTER_EMAIL: 'tests@example.invalid',
      },
    }).trim();
  git('init', '--quiet', '--initial-branch=main');
  const write = (file, content) =>
    writeFileSync(path.join(root, file), content);
  const run = (...args) =>
    spawnSync(
      process.execPath,
      [path.join(root, 'scripts/ci/check-doc-unused-imports.mjs'), ...args],
      { cwd: root, encoding: 'utf8' },
    );
  const snapshot = (files) => {
    git('add', '--', ...files);
    const sha = git('commit-tree', git('write-tree'), '-m', 'Fixture baseline');
    git('update-ref', 'refs/heads/main', sha);
    return sha;
  };
  return { root, write, run, snapshot };
}

test('CLI checks tracked sources, explicit paths and base revisions', (t) => {
  const { root, write, run, snapshot } = fixture(t);
  const file = 'docs/en/路径 example.mdx';
  write(file, "import { Existing, Used } from 'pkg';\n\n<Used />");
  write('docs/en/example.md', "import Fake from 'pkg';\n\n<unclosed");
  write(
    'sharedDocs/introDocs/fragment.mdx',
    "import { Used } from 'pkg';\n\n<Used/>",
  );
  const base = snapshot([
    file,
    'docs/en/example.md',
    'sharedDocs/introDocs/fragment.mdx',
  ]);

  const full = run();
  assert.equal(full.status, 1);
  assert.match(full.stderr, /unused import 'Existing'/);
  assert.equal(run('--base', base).status, 0);

  write(file, "import { Existing, Used, Added } from 'pkg';\n\nText");
  const changed = run('--base', 'HEAD', path.join(root, file));
  assert.equal(changed.status, 1);
  assert.doesNotMatch(changed.stderr, /unused import 'Existing'/);
  assert.match(changed.stderr, /unused import 'Used'/);
  assert.match(changed.stderr, /unused import 'Added'/);
  assert.match(changed.stdout, /1 existing unused imports/);

  write('docs/en/new.mdx', "import New from 'pkg';\n\nText");
  assert.equal(run('--base', base, 'docs/en/new.mdx').status, 1);
  assert.equal(
    run('docs/en/example.md', 'scripts/ci/documentation-parser.mjs').status,
    0,
  );
  assert.equal(run('--base').status, 1);
  assert.equal(run('--base', 'missing-ref').status, 1);
  assert.equal(run('--unknown').status, 1);
});

test('CLI reports malformed MDX and skips staged deletions', (t) => {
  const { root, write, run, snapshot } = fixture(t);
  const file = 'docs/en/deleted.mdx';
  write(file, 'Text');
  snapshot([file]);
  rmSync(path.join(root, file));
  assert.equal(run().status, 0);
  write(file, "import { Used } from 'pkg';\n\n<div");
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /could not analyze document/);
});
