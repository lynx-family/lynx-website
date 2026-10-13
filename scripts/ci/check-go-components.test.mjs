import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createExampleMetadataResolver,
  findGoComponentViolations,
} from './check-go-components.mjs';

const docPath = 'docs/en/guide/example.mdx';
const cdn = 'https://lf-lynx.tiktok-cdns.com';

function withGoImports(lines) {
  return [
    "import { Go } from '@lynx';",
    "import * as Lynx from '@lynx';",
    '',
    ...lines,
  ].join('\n');
}

test('accepts portable Go and Lynx.Go props', () => {
  assert.deepEqual(
    findGoComponentViolations(
      docPath,
      withGoImports([
        '<Go',
        '  example="view"',
        '  defaultEntryName="main"',
        `  img="${cdn}/obj/example.png"`,
        '/>',
        '<Lynx.Go example="list" defaultEntryName="waterfall" />',
      ]),
    ),
    [],
  );
});

test('rejects defaultEntryFile on both supported component names', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '<Go defaultEntryFile="dist/main.lynx.bundle" />',
      '<Lynx.Go',
      '  defaultEntryFile="dist/list.lynx.bundle"',
      '/>',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop, reason }) => ({
      line,
      component,
      prop,
      reason,
    })),
    [
      {
        line: 4,
        component: 'Go',
        prop: 'defaultEntryFile',
        reason: 'use defaultEntryName instead',
      },
      {
        line: 6,
        component: 'Lynx.Go',
        prop: 'defaultEntryFile',
        reason: 'use defaultEntryName instead',
      },
    ],
  );
});

test('requires defaultEntryName to be a string literal without metadata', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '<Go defaultEntryName={entryName} />',
      '<Lynx.Go defaultEntryName />',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop, reason }) => ({
      line,
      component,
      prop,
      reason,
    })),
    [
      {
        line: 4,
        component: 'Go',
        prop: 'defaultEntryName',
        reason: 'must be a string literal',
      },
      {
        line: 5,
        component: 'Lynx.Go',
        prop: 'defaultEntryName',
        reason: 'must be a string literal',
      },
    ],
  );
});

test('validates defaultEntryName against the matching example metadata', () => {
  const resolveExampleMetadata = (example) => {
    if (example === 'view') {
      return ['main', 'secondary'];
    }
    if (example === 'ambiguous') {
      return ['main', 'main'];
    }
    throw new Error(`metadata missing for example "${example}"`);
  };
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '<Go example="view" defaultEntryName="main" />',
      '<Go example="view" defaultEntryName="missing" />',
      '<Go example="ambiguous" defaultEntryName="main" />',
      '<Go example="unknown" defaultEntryName="main" />',
      '<Go example={exampleName} defaultEntryName="main" />',
      '<Go defaultEntryName="main" />',
    ]),
    { resolveExampleMetadata },
  );
  assert.deepEqual(
    violations.map(({ line, prop, reason }) => ({ line, prop, reason })),
    [
      {
        line: 5,
        prop: 'defaultEntryName',
        reason:
          '"missing" does not match example "view" metadata; available names: main, secondary',
      },
      {
        line: 6,
        prop: 'defaultEntryName',
        reason:
          '"main" is ambiguous in example "ambiguous" metadata (2 matches)',
      },
      {
        line: 7,
        prop: 'defaultEntryName',
        reason: 'metadata missing for example "unknown"',
      },
      {
        line: 8,
        prop: 'defaultEntryName',
        reason: 'example must be a string literal when defaultEntryName is set',
      },
      {
        line: 9,
        prop: 'defaultEntryName',
        reason: 'example must be a string literal when defaultEntryName is set',
      },
    ],
  );
});

test('uses the last duplicate example prop for metadata validation', () => {
  const resolvedExamples = [];
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '<Go example="view" example="list" defaultEntryName="main" />',
    ]),
    {
      resolveExampleMetadata: (example) => {
        resolvedExamples.push(example);
        return ['main'];
      },
    },
  );
  assert.deepEqual(resolvedExamples, ['list']);
  assert.deepEqual(violations, []);
});

test('loads and validates generated example metadata', (t) => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const metadataRoot = mkdtempSync(
    path.join(root, 'docs', '.go-metadata-test-'),
  );
  t.after(() => rmSync(metadataRoot, { recursive: true, force: true }));

  const writeMetadata = (example, value) => {
    const directory = path.join(metadataRoot, example);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      path.join(directory, 'example-metadata.json'),
      typeof value === 'string' ? value : JSON.stringify(value),
    );
  };
  writeMetadata('valid', {
    templateFiles: [{ name: 'main' }, { name: 'secondary' }],
  });
  writeMetadata('invalid-json', '{');
  writeMetadata('invalid-schema', { templateFiles: [{ file: 'main' }] });
  writeMetadata('duplicate', {
    templateFiles: [{ name: 'main' }, { name: 'main' }],
  });

  const resolveExampleMetadata = createExampleMetadataResolver(metadataRoot);
  assert.deepEqual(resolveExampleMetadata('valid'), ['main', 'secondary']);
  assert.throws(
    () => resolveExampleMetadata('../outside'),
    /resolves outside metadata root/,
  );
  assert.throws(
    () => resolveExampleMetadata('missing'),
    /could not read metadata for example "missing"/,
  );
  assert.throws(
    () => resolveExampleMetadata('invalid-json'),
    /could not read metadata for example "invalid-json"/,
  );
  assert.throws(
    () => resolveExampleMetadata('invalid-schema'),
    /invalid templateFiles\[0\]\.name/,
  );
  assert.throws(
    () => resolveExampleMetadata('duplicate'),
    /duplicate template name "main"/,
  );
});

test('rejects spread attributes on both supported component names', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '<Go',
      "  {...{ defaultEntryFile: 'dist/main.lynx.bundle' }}",
      '/>',
      '<Lynx.Go {...props} />',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop, reason }) => ({
      line,
      component,
      prop,
      reason,
    })),
    [
      {
        line: 5,
        component: 'Go',
        prop: 'spread',
        reason: 'spread attributes are not allowed',
      },
      {
        line: 7,
        component: 'Lynx.Go',
        prop: 'spread',
        reason: 'spread attributes are not allowed',
      },
    ],
  );
});

test('checks Go components rendered inside MDX expressions', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '{enabled && <Go defaultEntryFile="dist/main.lynx.bundle" />}',
      '{enabled ? <Lynx.Go img="/local.png" /> : null}',
      '<div>{<Go {...props} />}</div>',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop, reason }) => ({
      line,
      component,
      prop,
      reason,
    })),
    [
      {
        line: 4,
        component: 'Go',
        prop: 'defaultEntryFile',
        reason: 'use defaultEntryName instead',
      },
      {
        line: 5,
        component: 'Lynx.Go',
        prop: 'img',
        reason: 'img must be an absolute HTTPS URL',
      },
      {
        line: 6,
        component: 'Go',
        prop: 'spread',
        reason: 'spread attributes are not allowed',
      },
    ],
  );
});

test('checks expression attributes with nested JSX values', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '<Go',
      '  rightFooter={<GoRightFooter />}',
      "  defaultEntryFile={'dist/main.lynx.bundle'}",
      '/>',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop, reason }) => ({
      line,
      component,
      prop,
      reason,
    })),
    [
      {
        line: 6,
        component: 'Go',
        prop: 'defaultEntryFile',
        reason: 'use defaultEntryName instead',
      },
    ],
  );
});

test('follows named and namespace Go imports', () => {
  const violations = findGoComponentViolations(
    docPath,
    [
      "import { Go as Demo } from '@lynx/index';",
      "import * as Docs from '@lynx-ui/index';",
      "import * as Other from 'other-package';",
      '',
      '<Demo defaultEntryFile="dist/main.lynx.bundle" />',
      '{enabled && <Docs.Go img="/local.png" />}',
      '<Other.Go defaultEntryFile="dist/ignored.lynx.bundle" />',
    ].join('\n'),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop }) => ({
      line,
      component,
      prop,
    })),
    [
      { line: 5, component: 'Demo', prop: 'defaultEntryFile' },
      { line: 6, component: 'Docs.Go', prop: 'img' },
    ],
  );
});

test('follows direct Go module imports with and without extensions', () => {
  const violations = findGoComponentViolations(
    docPath,
    [
      "import DefaultGo from '@lynx/go/Go';",
      "import { Go as NamedGo } from '@lynx/go/Go.tsx';",
      "import * as GoModule from '@lynx/go/Go';",
      '',
      '<DefaultGo defaultEntryFile="dist/default.lynx.bundle" />',
      '<NamedGo img="/named.png" />',
      '<GoModule.Go {...props} />',
      '<GoModule.default defaultEntryFile="dist/namespace-default.lynx.bundle" />',
    ].join('\n'),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop }) => ({
      line,
      component,
      prop,
    })),
    [
      { line: 5, component: 'DefaultGo', prop: 'defaultEntryFile' },
      { line: 6, component: 'NamedGo', prop: 'img' },
      { line: 7, component: 'GoModule.Go', prop: 'spread' },
      { line: 8, component: 'GoModule.default', prop: 'defaultEntryFile' },
    ],
  );
});

test('resolves legacy Go aliases through the TypeScript resolver', () => {
  const violations = findGoComponentViolations(
    docPath,
    [
      "import { Go as NamedGo } from '@/components/go/Go';",
      "import DefaultGo from '@/components/go/Go.tsx';",
      "import * as GoModule from '@/components/go/Go';",
      "import { Go as NamedGoWithExtension } from '@/components/go/Go.tsx';",
      "import DefaultGoWithoutExtension from '@/components/go/Go';",
      "import * as GoModuleWithExtension from '@/components/go/Go.tsx';",
      '',
      '<NamedGo defaultEntryFile="dist/named.lynx.bundle" />',
      '<DefaultGo img="/default.png" />',
      '<GoModule.Go {...props} />',
      '<NamedGoWithExtension defaultEntryFile="dist/named-ext.lynx.bundle" />',
      '<DefaultGoWithoutExtension img="/default-no-ext.png" />',
      '<GoModuleWithExtension.Go {...props} />',
    ].join('\n'),
  );
  assert.deepEqual(
    violations.map(({ component, prop }) => ({ component, prop })),
    [
      { component: 'NamedGo', prop: 'defaultEntryFile' },
      { component: 'DefaultGo', prop: 'img' },
      { component: 'GoModule.Go', prop: 'spread' },
      { component: 'NamedGoWithExtension', prop: 'defaultEntryFile' },
      { component: 'DefaultGoWithoutExtension', prop: 'img' },
      { component: 'GoModuleWithExtension.Go', prop: 'spread' },
    ],
  );
});

test('ignores Go components imported from unrelated modules', () => {
  assert.deepEqual(
    findGoComponentViolations(
      docPath,
      [
        "import { Go } from 'other-package';",
        "import * as Lynx from 'another-package';",
        '',
        '<Go defaultEntryFile="dist/main.lynx.bundle" img="/local.png" />',
        '<Lynx.Go {...props} />',
      ].join('\n'),
    ),
    [],
  );
});

test('respects expression-local bindings that shadow Go imports', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '{items.map(Go => <Go img="/local.png" />)}',
      '{items.map(({ component: Lynx }) => <Lynx.Go {...props} />)}',
      '{(() => { const Go = Other; return <Go img="/local.png" /> })()}',
      '{(() => { var Lynx; return <Lynx.Go {...props} /> })()}',
      '{items.map(() => <Go img="/local.png" />)}',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop }) => ({
      line,
      component,
      prop,
    })),
    [{ line: 8, component: 'Go', prop: 'img' }],
  );
});

test('keeps static block bindings inside their own scope', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '{(() => {',
      '  class Example {',
      '    static {',
      '      var Go = Other;',
      '      const Lynx = Other;',
      '      <Go img="/inside.png" />;',
      '      <Lynx.Go {...props} />;',
      '    }',
      '  }',
      '  return <Go img="/outside.png" />;',
      '})()}',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, component, prop }) => ({
      line,
      component,
      prop,
    })),
    [{ line: 13, component: 'Go', prop: 'img' }],
  );
});

test('rejects non-CDN and non-literal image props', () => {
  const violations = findGoComponentViolations(
    docPath,
    withGoImports([
      '<Go img="/assets/local.png" />',
      '<Go img="http://lf-lynx.tiktok-cdns.com/example.png" />',
      '<Go img="https://example.com/example.png" />',
      '<Go img="https://lf-lynx.tiktok-cdns.com:444/example.png" />',
      '<Go img={previewImage} />',
      '<Go img />',
    ]),
  );
  assert.deepEqual(
    violations.map(({ line, prop, reason }) => ({ line, prop, reason })),
    [
      { line: 4, prop: 'img', reason: 'img must be an absolute HTTPS URL' },
      {
        line: 5,
        prop: 'img',
        reason: `img must use an approved origin: ${cdn}`,
      },
      {
        line: 6,
        prop: 'img',
        reason: `img must use an approved origin: ${cdn}`,
      },
      {
        line: 7,
        prop: 'img',
        reason: `img must use an approved origin: ${cdn}`,
      },
      { line: 8, prop: 'img', reason: 'img must be a string literal' },
      { line: 9, prop: 'img', reason: 'img must be a string literal' },
    ],
  );
});

test('ignores examples, comments, and unrelated components', () => {
  assert.deepEqual(
    findGoComponentViolations(
      docPath,
      withGoImports([
        '```tsx',
        '<Go defaultEntryFile="dist/main.lynx.bundle" img="/local.png" />',
        '```',
        '',
        '{/* <Go defaultEntryFile="dist/main.lynx.bundle" /> */}',
        '<Example.Go defaultEntryFile="dist/main.lynx.bundle" />',
        '<Image img="/local.png" />',
      ]),
    ),
    [],
  );
});

test('uses Markdown semantics for .md files', () => {
  assert.deepEqual(
    findGoComponentViolations(
      'docs/en/example.md',
      '<Go defaultEntryFile="dist/main.lynx.bundle" img="/local.png" />',
    ),
    [],
  );
});

test('preserves source lines after frontmatter', () => {
  const violations = findGoComponentViolations(
    docPath,
    [
      '---',
      'title: Example',
      '---',
      '',
      "import { Go } from '@lynx';",
      '',
      '<Go img="/local.png" />',
    ].join('\n'),
  );
  assert.equal(violations[0].line, 7);
});

test('throws for invalid MDX instead of silently skipping the document', () => {
  assert.throws(
    () =>
      findGoComponentViolations(
        docPath,
        'import Preview from "./preview"\nconst preview = "/local.png"',
      ),
    /only import\/exports are supported/,
  );
});

test('CLI reports parse failures and violations together', (t) => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const directory = mkdtempSync(path.join(tmpdir(), 'go-check-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const documentationDirectory = path.join(directory, 'docs');
  mkdirSync(documentationDirectory, { recursive: true });
  const invalid = path.join(documentationDirectory, 'invalid.mdx');
  const violation = path.join(documentationDirectory, 'violation.mdx');
  const markdown = path.join(documentationDirectory, 'example.md');
  const semantic = path.join(documentationDirectory, 'semantic.mdx');
  const metadataRoot = path.join(directory, 'metadata');
  writeFileSync(
    invalid,
    'import Preview from "./preview"\nconst preview = "/local.png"\n',
  );
  writeFileSync(
    violation,
    withGoImports([
      '<Lynx.Go defaultEntryFile="dist/main.lynx.bundle" img="/local.png" />',
      '<Go {...props} />',
      '',
    ]),
  );
  writeFileSync(
    markdown,
    '<Go defaultEntryFile="dist/main.lynx.bundle" img="/local.png" />\n',
  );
  writeFileSync(
    semantic,
    withGoImports(['<Go example="view" defaultEntryName="missing" />', '']),
  );
  mkdirSync(path.join(metadataRoot, 'view'), { recursive: true });
  writeFileSync(
    path.join(metadataRoot, 'view', 'example-metadata.json'),
    JSON.stringify({ templateFiles: [{ name: 'main' }] }),
  );

  const script = fileURLToPath(
    new URL('./check-go-components.mjs', import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [script, '--scan-root', directory, invalid, violation, markdown],
    {
      cwd: directory,
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid\.mdx:2: could not parse document/);
  assert.match(
    result.stderr,
    /violation\.mdx:4: <Lynx\.Go> defaultEntryFile: use defaultEntryName instead/,
  );
  assert.match(
    result.stderr,
    /violation\.mdx:4: <Lynx\.Go> img: img must be an absolute HTTPS URL/,
  );
  assert.match(
    result.stderr,
    /violation\.mdx:5: <Go> spread: spread attributes are not allowed/,
  );

  const defaultScan = spawnSync(
    process.execPath,
    [script, '--scan-root', directory],
    {
      cwd: directory,
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.equal(defaultScan.status, 1);
  assert.match(
    defaultScan.stderr,
    /violation\.mdx:4: <Lynx\.Go> defaultEntryFile: use defaultEntryName instead/,
  );

  const allowed = spawnSync(
    process.execPath,
    [
      script,
      '--scan-root',
      directory,
      markdown,
      path.join(directory, 'deleted.mdx'),
      path.join(root, 'README.md'),
    ],
    { cwd: directory, encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(allowed.status, 0, allowed.stderr);

  const semanticResult = spawnSync(
    process.execPath,
    [
      script,
      '--scan-root',
      directory,
      '--metadata-root',
      metadataRoot,
      semantic,
    ],
    { cwd: directory, encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(semanticResult.status, 1);
  assert.match(
    semanticResult.stderr,
    /semantic\.mdx:4: <Go> defaultEntryName: "missing" does not match example "view" metadata; available names: main/,
  );

  const missingRoot = spawnSync(
    process.execPath,
    [
      script,
      '--scan-root',
      directory,
      '--metadata-root',
      path.join(directory, 'missing'),
      semantic,
    ],
    { cwd: directory, encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(missingRoot.status, 1);
  assert.match(
    missingRoot.stderr,
    /Go component checker: could not read metadata root/,
  );
});
