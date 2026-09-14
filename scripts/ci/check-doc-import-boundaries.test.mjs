import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { findSourceBoundaryImports } from './check-doc-import-boundaries.mjs';

const projectRequire = createRequire(import.meta.url);
const projectPackage = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);
const rspressPackagePath = projectRequire.resolve('@rspress/core/package.json');
const rspressPackage = JSON.parse(readFileSync(rspressPackagePath, 'utf8'));
const rspressRequire = createRequire(rspressPackagePath);
// Rspress does not expose its parser setup as a public API. A version bump must
// therefore trigger a review of its MDX options and preprocessing behavior.
const auditedRspressVersion = '2.0.19';
const parserDependencies = [
  '@mdx-js/mdx',
  'remark-cjk-friendly',
  'remark-cjk-friendly-gfm-strikethrough',
  'remark-gfm',
];
const parserAuditTestCommand =
  'node --test scripts/ci/check-doc-import-boundaries.test.mjs';

function rspressVersionAuditMessage(installedVersion) {
  return [
    'Rspress parser audit required.',
    `Audited @rspress/core version: ${auditedRspressVersion}`,
    `Installed @rspress/core version: ${installedVersion}`,
    '',
    'Before updating auditedRspressVersion:',
    '1. Compare @rspress/core/dist/node/mdx/options.js and processor.js.',
    '2. Review .md/.mdx format selection, syntax plugins, frontmatter, and heading-ID preprocessing.',
    '3. Align the parser dependencies in package.json and pnpm-lock.yaml.',
    `4. Run: ${parserAuditTestCommand}`,
  ].join('\n');
}

// Keep this path deeply nested so tests exercise the traversal that made an
// OSS-local component import resolve differently in downstream layouts.
const docPath = 'docs/en/guide/inclusion/foldable-devices.mdx';

test('uses an audited Rspress parser contract', () => {
  if (rspressPackage.version !== auditedRspressVersion) {
    assert.fail(rspressVersionAuditMessage(rspressPackage.version));
  }
});

test('reports actionable instructions for unaudited Rspress versions', () => {
  const message = rspressVersionAuditMessage('2.0.21');
  for (const expected of [
    'Audited @rspress/core version: 2.0.19',
    'Installed @rspress/core version: 2.0.21',
    '@rspress/core/dist/node/mdx/options.js',
    'frontmatter',
    'parser dependencies in package.json and pnpm-lock.yaml',
    parserAuditTestCommand,
  ]) {
    assert.ok(
      message.includes(expected),
      `missing audit instruction: ${expected}`,
    );
  }
});

test('resolves parser dependencies from the same installation as Rspress', () => {
  const problems = [];
  for (const dependency of parserDependencies) {
    const projectRange = projectPackage.devDependencies[dependency];
    const rspressRange = rspressPackage.dependencies[dependency];
    if (!projectRange) {
      problems.push(`- ${dependency} is not a direct project devDependency.`);
    }
    if (!rspressRange) {
      problems.push(
        `- ${dependency} is no longer a direct @rspress/core dependency.`,
      );
    }
    if (
      projectRange &&
      rspressRange &&
      projectRequire.resolve(dependency) !== rspressRequire.resolve(dependency)
    ) {
      problems.push(
        [
          `- ${dependency} resolves to different installations:`,
          `  project (${projectRange}): ${projectRequire.resolve(dependency)}`,
          `  @rspress/core (${rspressRange}): ${rspressRequire.resolve(dependency)}`,
        ].join('\n'),
      );
    }
  }

  if (problems.length > 0) {
    assert.fail(
      [
        'Rspress parser dependency alignment failed.',
        ...problems,
        '',
        'Review the new Rspress parser setup, align direct devDependencies,',
        'run pnpm install, and then rerun:',
        `  ${parserAuditTestCommand}`,
      ].join('\n'),
    );
  }
});

test('rejects relative imports that resolve into src', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    `import {
  FoldableRenderFlow,
} from '../../../../src/components/foldable-render-flow';
`,
  );

  assert.deepEqual(violations, [
    {
      file: docPath,
      line: 1,
      specifier: '../../../../src/components/foldable-render-flow',
      target: 'src/components/foldable-render-flow',
      suggestion: '@lynx/foldable-render-flow',
    },
  ]);
});

test('canonicalizes suggestions for known component roots', () => {
  // Suggestions should describe stable module entry points, not source file
  // extensions or directory index files from the current checkout.
  const cases = [
    ['../../../../src/components/index.tsx', '@lynx'],
    ['../../../../src/components/foo/index.tsx', '@lynx/foo'],
    ['../../../../src/components/foo.tsx', '@lynx/foo'],
    ['../../../../src/components/foo.css', '@lynx/foo.css'],
    ['../../../../src/lynx-ui/components/index.tsx', '@lynx-ui'],
    [
      '../../../../src/lynx-ui/components/ui-api-table/index.tsx',
      '@lynx-ui/ui-api-table',
    ],
    [
      '../../../../src/components/foo/index.tsx?raw#example',
      '@lynx/foo?raw#example',
    ],
  ];

  for (const [specifier, suggestion] of cases) {
    const violations = findSourceBoundaryImports(
      docPath,
      `import Example from '${specifier}';\n`,
    );

    assert.equal(violations[0].suggestion, suggestion, specifier);
  }
});

test('allows shared aliases and document-local relative imports', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    `import { FoldableRenderFlow } from '@lynx/foldable-render-flow';
import Example from './Example';
`,
  );

  assert.deepEqual(violations, []);
});

test('ignores imports shown inside fenced code examples', () => {
  // Different delimiters and Markdown containers still represent examples,
  // not executable MDX imports.
  const violations = findSourceBoundaryImports(
    docPath,
    [
      '~~~tsx',
      "import { Example } from '../../../../src/components/example';",
      '~~~',
      '',
      '```tsx',
      "import { OtherExample } from '../../../../src/components/other-example';",
      '```',
      '',
      '> ````tsx',
      "> import('../../../../src/components/blockquote-example');",
      '> ````',
      '',
    ].join('\n'),
  );

  assert.deepEqual(violations, []);
});

test('resumes scanning after leaving an unclosed blockquote fence', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    [
      '> ```tsx',
      "> import('../../../../src/components/example');",
      "import Example from '../../../../src/components/example';",
      '',
    ].join('\n'),
  );

  assert.equal(violations.length, 1);
  assert.equal(violations[0].line, 3);
});

test('rejects side-effect imports and other src subtrees', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    `import '../../../../src/styles.css';
`,
  );

  assert.deepEqual(violations, [
    {
      file: docPath,
      line: 1,
      specifier: '../../../../src/styles.css',
      target: 'src/styles.css',
      suggestion: undefined,
    },
  ]);
});

test('rejects relative theme imports without guessing an alias', () => {
  const [violation] = findSourceBoundaryImports(
    docPath,
    "import Theme from '../../../../theme/index';",
  );

  assert.deepEqual(violation, {
    file: docPath,
    line: 1,
    specifier: '../../../../theme/index',
    target: 'theme/index',
    suggestion: undefined,
  });
});

test('rejects dynamic imports that resolve into src', () => {
  // Executable MDX can load modules with import(), so it shares the boundary.
  const violations = findSourceBoundaryImports(
    docPath,
    `export const loadExample = () =>
  import('../../../../src/components/example');
`,
  );

  assert.deepEqual(violations, [
    {
      file: docPath,
      line: 2,
      specifier: '../../../../src/components/example',
      target: 'src/components/example',
      suggestion: '@lynx/example',
    },
  ]);
});

test('recognizes comments between import tokens', () => {
  // JavaScript comments can replace whitespace around module specifiers.
  const violations = findSourceBoundaryImports(
    docPath,
    `import { StaticExample } from/* owner */'../../../../src/components/static-example';
export { ReExport } from/* owner */'../../../../src/components/re-export';
import/* styles */'../../../../src/components/styles.css';
export const DynamicExample = import/* lazy */(/* source */'../../../../src/components/dynamic-example'/* end */);
`,
  );

  assert.deepEqual(
    violations.map(({ line, specifier, suggestion }) => ({
      line,
      specifier,
      suggestion,
    })),
    [
      {
        line: 1,
        specifier: '../../../../src/components/static-example',
        suggestion: '@lynx/static-example',
      },
      {
        line: 2,
        specifier: '../../../../src/components/re-export',
        suggestion: '@lynx/re-export',
      },
      {
        line: 3,
        specifier: '../../../../src/components/styles.css',
        suggestion: '@lynx/styles.css',
      },
      {
        line: 4,
        specifier: '../../../../src/components/dynamic-example',
        suggestion: '@lynx/dynamic-example',
      },
    ],
  );
});

test('ignores a leading block comment followed by import-like prose', () => {
  // MDX parses this line as a paragraph, not as an ESM declaration.
  const violations = findSourceBoundaryImports(
    docPath,
    `/* import ownership */ import Example from '../../../../src/components/example';
`,
  );

  assert.deepEqual(violations, []);
});

test('ignores imports inside JavaScript comments', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    `// import('../../../../src/components/line-comment');
{/*
import BlockComment from '../../../../src/components/block-comment';
*/}
`,
  );

  assert.deepEqual(violations, []);
});

test('ignores import-like text in quoted values and inline code', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    [
      `export const example = "import('../../../../src/components/string')";`,
      '',
      "Use `import('../../../../src/components/inline-code')` to load a module.",
      "Use ``import('../../../../src/components/double-inline-code')`` too.",
      '',
    ].join('\n'),
  );

  assert.deepEqual(violations, []);
});

test('does not extend a semicolonless import into following MDX content', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    `import ExternalComponent from '@scope/components'

The prose says from '../../../../src/components/not-an-import'.

export const example = "from '../../../../src/components/not-an-export'";
`,
  );

  assert.deepEqual(violations, []);
});

test('reports the import line without consuming preceding blank lines', () => {
  const violations = findSourceBoundaryImports(
    docPath,
    `

import Example from '../../../../src/components/example';
`,
  );

  assert.equal(violations[0].line, 3);
});

test('does not combine consecutive semicolonless imports', () => {
  // MDX imports may omit semicolons; each declaration must remain independent.
  const violations = findSourceBoundaryImports(
    docPath,
    `import ExternalComponent from '@scope/components'
import LocalComponent from '../../../../src/components/local'
`,
  );

  assert.deepEqual(violations, [
    {
      file: docPath,
      line: 2,
      specifier: '../../../../src/components/local',
      target: 'src/components/local',
      suggestion: '@lynx/local',
    },
  ]);
});

test('does not extend named imports into exported strings', () => {
  assert.deepEqual(
    findSourceBoundaryImports(
      docPath,
      `import { X } from '@scope/x'
export const note = "} from '../../../../src/components/example'"
`,
    ),
    [],
  );
});

test('detects expressions after prose URLs and inside template substitutions', () => {
  // A URL is Markdown text; a template substitution is executable JavaScript.
  const content = [
    "https://example.com {import('../../../../src/components/url')}",
    '',
    "export const value = `text ${import('../../../../src/components/template')}`",
  ].join('\n');
  assert.deepEqual(
    findSourceBoundaryImports(docPath, content).map(({ line, suggestion }) => [
      line,
      suggestion,
    ]),
    [
      [1, '@lynx/url'],
      [3, '@lynx/template'],
    ],
  );
});

test('recognizes Unicode import identifiers', () => {
  assert.equal(
    findSourceBoundaryImports(
      docPath,
      "import \u793a\u4f8b from '../../../../src/components/example'",
    )[0]?.suggestion,
    '@lynx/example',
  );
});

test('ends an unclosed list fence when leaving its container', () => {
  const content = [
    '- Example:',
    '',
    '  ```js',
    "  import('../../../../src/components/ignored')",
    '',
    "import X from '../../../../src/components/example'",
  ].join('\n');
  assert.deepEqual(
    findSourceBoundaryImports(docPath, content).map(({ line }) => line),
    [6],
  );
});

test('ignores longer backtick runs inside inline code', () => {
  assert.deepEqual(
    findSourceBoundaryImports(
      docPath,
      "Use `` ``` import('../../../../src/components/example') `` here.",
    ),
    [],
  );
});

test('preserves frontmatter and heading-ID line numbers with LF and CRLF', () => {
  for (const newline of ['\n', '\r\n']) {
    const content = [
      '---',
      'title: "import ignored from ../../../../src/components/metadata"',
      '---',
      '',
      '# Example {#custom}',
      '',
      "import X from '../../../../src/components/example'",
    ].join(newline);
    assert.equal(findSourceBoundaryImports(docPath, content)[0].line, 7);
  }
});

test('visits JSX attribute expressions, spread attributes, and GFM table cells', () => {
  const content = [
    "<Example load={() => import('../../../../src/components/attr')} {...{load: import('../../../../src/components/spread')}} />",
    '',
    '| Example |',
    '| --- |',
    "| {import('../../../../src/components/table')} |",
  ].join('\n');
  assert.deepEqual(
    findSourceBoundaryImports(docPath, content).map(({ line, suggestion }) => [
      line,
      suggestion,
    ]),
    [
      [1, '@lynx/attr'],
      [1, '@lynx/spread'],
      [5, '@lynx/table'],
    ],
  );
});

test('checks export sources and decoded module strings without executing code', () => {
  const content = [
    "export * from '../../../../src/components/all'",
    "export * as group from '../../../../src/components/group'",
    "import X from '\\u002e\\u002e/../../../src/components/escaped'",
    "export const crash = (() => { throw new Error('must not execute'); })()",
  ].join('\n');
  assert.deepEqual(
    findSourceBoundaryImports(docPath, content).map(
      ({ suggestion }) => suggestion,
    ),
    ['@lynx/all', '@lynx/group', '@lynx/escaped'],
  );
});

test('uses plain Markdown semantics for .md and MDX semantics for .mdx', () => {
  const content = "import X from '../../../../src/components/example'";
  assert.deepEqual(
    findSourceBoundaryImports(docPath.replace('.mdx', '.md'), content),
    [],
  );
  assert.equal(findSourceBoundaryImports(docPath, content).length, 1);
  assert.equal(
    findSourceBoundaryImports(
      'sharedDocs/packageDocs/example.mdx',
      "import X from '../../src/components/example'",
    )[0].suggestion,
    '@lynx/example',
  );
});

test('checks no-substitution template dynamic sources', () => {
  assert.deepEqual(
    findSourceBoundaryImports(
      docPath,
      'export const load = () => import(`../../../../src/components/example`)',
    ).map(({ line, suggestion }) => [line, suggestion]),
    [[1, '@lynx/example']],
  );
});

test('does not evaluate computed dynamic sources or reject existing aliases', () => {
  assert.deepEqual(
    findSourceBoundaryImports(
      docPath,
      [
        "import X from '@lynx/index'",
        "export const load = (name) => import('../../../../src/' + name)",
        'export const template = (name) => import(`../../../../src/components/${name}`)',
        "export const local = () => import('./Example')",
      ].join('\n'),
    ),
    [],
  );
});

test('throws for invalid MDX instead of silently skipping the document', () => {
  assert.throws(
    () =>
      findSourceBoundaryImports(docPath, "import X from './x'\nconst x = 1"),
    /only import\/exports are supported/,
  );
});

test('never evaluates JavaScript frontmatter', () => {
  const content = [
    '---javascript',
    "(() => { throw new Error('must not execute metadata'); })()",
    '---',
    '',
    "import X from '../../../../src/components/example'",
  ].join('\n');
  assert.equal(findSourceBoundaryImports(docPath, content)[0].line, 5);
});

test('CLI reports parse failures and violations together and ignores unrelated paths', (t) => {
  // Temporary documents remain inside the repository so path selection is real.
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const directory = mkdtempSync(path.join(root, 'docs', '.boundary-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const invalid = path.join(directory, 'invalid.mdx');
  const violation = path.join(directory, 'violation.mdx');
  const markdown = path.join(directory, 'example.md');
  writeFileSync(invalid, "import X from './x'\nconst x = 1\n");
  writeFileSync(violation, "import X from '../../src/components/example'\n");
  writeFileSync(markdown, "import X from '../../src/components/example'\n");
  const script = fileURLToPath(
    new URL('./check-doc-import-boundaries.mjs', import.meta.url),
  );
  const result = spawnSync(process.execPath, [script, invalid, violation], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid\.mdx:2: could not parse document/);
  assert.match(result.stderr, /violation\.mdx:1:.*@lynx\/example/);
  const allowed = spawnSync(
    process.execPath,
    [
      script,
      markdown,
      path.join(directory, 'deleted.mdx'),
      path.join(root, 'README.md'),
    ],
    { cwd: directory, encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(allowed.status, 0, allowed.stderr);
});
