import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { findMisplacedImports } from './check-doc-import-placement.mjs';

const docPath = 'docs/en/guide/example.mdx';

test('allows static imports placed in the module prelude', () => {
  const content = [
    "import { APISummary } from '@lynx';",
    "import External from 'external-package';",
    "import './prelude-style.css';",
    '',
    '# Example Title',
    '',
    '<APISummary />',
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), []);
});

test('allows frontmatter and multiline imports in the prelude with LF and CRLF', () => {
  for (const newline of ['\n', '\r\n']) {
    const content = [
      '---',
      'title: Example Document',
      'api: test/example',
      '---',
      '',
      'import {',
      '  APISummary,',
      '  APITable,',
      "} from '@lynx';",
      '',
      '## Introduction',
      '',
      'Content text goes here.',
    ].join(newline);

    assert.deepEqual(findMisplacedImports(docPath, content), []);
  }
});

test('allows pure MDX comments and leading ESM exports in the prelude', () => {
  const content = [
    '{/* Comment before prelude imports */}',
    '',
    "import { APISummary } from '@lynx';",
    '',
    '{/* Comment between prelude declarations */}',
    '',
    'export const metadata = { active: true };',
    '',
    "import Component from './Component.jsx';",
    '',
    '# Heading Starts Body',
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), []);
});

test('rejects static imports placed after a heading', () => {
  const content = [
    '# Document Heading',
    '',
    "import { PropertyDefinition } from '@lynx';",
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), [
    {
      file: docPath,
      line: 3,
      specifier: '@lynx',
    },
  ]);
});

test('rejects static imports placed after a paragraph', () => {
  const content = [
    'This is introductory text.',
    '',
    "import { Steps } from '@theme';",
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), [
    {
      file: docPath,
      line: 3,
      specifier: '@theme',
    },
  ]);
});

test('rejects static imports placed after rendered JSX', () => {
  const content = [
    "import { APISummary } from '@lynx';",
    '',
    '<APISummary />',
    '',
    "import { PropertyDefinition } from '@lynx';",
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), [
    {
      file: docPath,
      line: 5,
      specifier: '@lynx',
    },
  ]);
});

test('rejects static imports placed after various body node types', () => {
  const cases = [
    {
      name: 'code block',
      content: ['```ts', 'const x = 1;', '```', '', "import { A } from 'pkg';"],
      line: 5,
    },
    {
      name: 'list',
      content: ['- Item 1', '- Item 2', '', "import { A } from 'pkg';"],
      line: 4,
    },
    {
      name: 'table',
      content: [
        '| Header |',
        '| --- |',
        '| Cell |',
        '',
        "import { A } from 'pkg';",
      ],
      line: 5,
    },
    {
      name: 'blockquote',
      content: ['> Quote text', '', "import { A } from 'pkg';"],
      line: 3,
    },
    {
      name: 'thematic break',
      content: [
        '---',
        'title: Example',
        '---',
        '',
        '---',
        '',
        "import { A } from 'pkg';",
      ],
      line: 7,
    },
    {
      name: 'executable expression',
      content: ['{ 1 + 2 }', '', "import { A } from 'pkg';"],
      line: 3,
    },
  ];

  for (const { name, content, line } of cases) {
    const violations = findMisplacedImports(docPath, content.join('\n'));
    assert.equal(violations.length, 1, `failed for ${name}`);
    assert.equal(violations[0].line, line, `line mismatch for ${name}`);
    assert.equal(
      violations[0].specifier,
      'pkg',
      `specifier mismatch for ${name}`,
    );
  }
});

test('rejects multiline and side-effect imports in the body', () => {
  const content = [
    '## Formal Definition',
    '',
    'import {',
    '  PropertyDefinition,',
    "} from '@lynx';",
    '',
    "import './body-side-effect.css';",
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), [
    {
      file: docPath,
      line: 3,
      specifier: '@lynx',
    },
    {
      file: docPath,
      line: 7,
      specifier: './body-side-effect.css',
    },
  ]);
});

test('allows dynamic import() expressions inside body nodes', () => {
  const content = [
    '# Dynamic Import Example',
    '',
    "<Go load={() => import('./dynamic-component')} />",
    '',
    '{(() => { const x = import("./dynamic-in-expression"); return null; })()}',
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), []);
});

test('ignores import-looking prose and code examples', () => {
  const content = [
    '# Prose & Examples',
    '',
    'Use `import { Go } from "@lynx"` to load the component.',
    '',
    '```tsx',
    "import { APITable } from '@lynx';",
    '```',
    '',
    "> ``import { Steps } from '@theme'``",
  ].join('\n');

  assert.deepEqual(findMisplacedImports(docPath, content), []);
});

test('ignores import statements in plain .md files', () => {
  const markdownPath = 'docs/en/guide/example.md';
  const content = [
    '# Plain Markdown Document',
    '',
    "import { APISummary } from '@lynx';",
  ].join('\n');

  assert.deepEqual(findMisplacedImports(markdownPath, content), []);
});

test('throws on unparsable MDX syntax', () => {
  const content = "import X from './x'\nconst x = 1\n";
  assert.throws(
    () => findMisplacedImports(docPath, content),
    /only import\/exports are supported/,
  );
});

test('CLI reports misplaced imports, parse failures, and ignores unrelated files', (t) => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const directory = mkdtempSync(path.join(root, 'docs', '.placement-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const invalid = path.join(directory, 'invalid.mdx');
  const violation = path.join(directory, 'violation.mdx');
  const markdown = path.join(directory, 'example.md');
  const valid = path.join(directory, 'valid.mdx');

  writeFileSync(invalid, "import X from './x'\nconst x = 1\n");
  writeFileSync(
    violation,
    "# Title\n\nimport { PropertyDefinition } from '@lynx';\n",
  );
  writeFileSync(
    markdown,
    "# Title\n\nimport { PropertyDefinition } from '@lynx';\n",
  );
  writeFileSync(
    valid,
    "import { PropertyDefinition } from '@lynx';\n\n# Title\n",
  );

  const script = fileURLToPath(
    new URL('./check-doc-import-placement.mjs', import.meta.url),
  );

  const result = spawnSync(process.execPath, [script, invalid, violation], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 30_000,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid\.mdx:2: could not parse document/);
  assert.match(result.stderr, /violation\.mdx:3: static import from '@lynx'/);

  // Allowed files (valid MDX, plain .md, deleted file, non-doc file) return exit code 0
  const allowed = spawnSync(
    process.execPath,
    [
      script,
      valid,
      markdown,
      path.join(directory, 'deleted.mdx'),
      path.join(root, 'README.md'),
    ],
    { cwd: directory, encoding: 'utf8', timeout: 30_000 },
  );

  assert.equal(allowed.status, 0, allowed.stderr);
});
