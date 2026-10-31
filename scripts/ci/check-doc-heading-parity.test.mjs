import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkHeadingParity,
  extractHeadings,
  headingExceptions,
  headingParityAllowlist,
  pairDocuments,
} from './check-doc-heading-parity.mjs';

const en = 'docs/en/guide/example.mdx';
const zh = 'docs/zh/guide/example.mdx';
const pair = { key: 'docs/guide/example', en, zh };

function check(enContent, zhContent, allowlist = new Set()) {
  return checkHeadingParity(
    [pair],
    (file) => (file === en ? enContent : zhContent),
    allowlist,
  );
}

test('pairs routes across formats and shared fragment naming conventions', () => {
  assert.deepEqual(
    pairDocuments([
      'docs/zh/guide/example.md',
      en,
      'docs/en/guide/untranslated.mdx',
      'docs/zh/guide/zh-only.mdx',
      'docs/public/example.md',
      'sharedDocs/introDocs/example/Introduction.zh.mdx',
      'sharedDocs/introDocs/example/Introduction.mdx',
      'sharedDocs/packageDocs/example/APIReference.mdx',
      'sharedDocs/introDocs/example/demoMeta.ts',
    ]),
    [
      { ...pair, zh: 'docs/zh/guide/example.md' },
      {
        key: 'sharedDocs/introDocs/example/Introduction',
        en: 'sharedDocs/introDocs/example/Introduction.mdx',
        zh: 'sharedDocs/introDocs/example/Introduction.zh.mdx',
      },
    ],
  );
});

test('rejects ambiguous same-locale routes', () => {
  assert.throws(
    () => pairDocuments([en, en.replace('.mdx', '.md'), zh]),
    /Ambiguous en document pair/,
  );
});

test('allows translated heading text and compares all six levels', () => {
  assert.deepEqual(
    check(
      '# English\n\n## Usage\n\n### Detail\n\n#### Four\n\n##### Five\n\n###### Six',
      '# 中文\n\n## 用法\n\n### 详情\n\n#### 四\n\n##### 五\n\n###### 六',
    ),
    { violations: [], allowed: [] },
  );
});

test('accepts matching skipped heading levels in both locales', () => {
  assert.deepEqual(
    check(
      '# English\n\n## Usage\n\n#### Detail\n\n###### Six',
      '# 中文\n\n## 用法\n\n#### 详情\n\n###### 六',
    ),
    { violations: [], allowed: [] },
  );
});

test('detects missing headings and retains both source locations', () => {
  const [violation] = check(
    '# Title\n\n## Usage\n\n### Detail',
    '# 标题\n\n## 用法',
  ).violations;
  assert.equal(violation.reason, 'heading count differs');
  assert.equal(violation.index, 2);
  assert.equal(violation.line, 5);
  assert.equal(violation.enHeadings.length, 3);
  assert.equal(violation.zhHeadings.length, 2);
});

test('rejects equal counts with different hierarchy or order', () => {
  for (const zhContent of [
    '# 标题\n\n### 用法\n\n## 详情',
    '# 标题\n\n## 用法\n\n#### 详情',
  ]) {
    assert.equal(
      check('# Title\n\n## Usage\n\n### Detail', zhContent).violations[0]
        .reason,
      'heading hierarchy differs',
    );
  }
});

test('recognizes Setext and container headings while ignoring code and comments', () => {
  const content = [
    'Title',
    '=====',
    '',
    'Usage',
    '-----',
    '',
    '> ### Quote',
    '',
    '- Item',
    '',
    '  #### Nested',
    '',
    '```md',
    '# Fenced example',
    '```',
    '',
    '    ## Indented example',
    '',
    '{/* ## Comment */}',
    '',
    '`### Inline example`',
  ].join('\n');
  assert.deepEqual(extractHeadings(en.replace('.mdx', '.md'), content), [
    { depth: 1, line: 1 },
    { depth: 2, line: 4 },
    { depth: 3, line: 7 },
    { depth: 4, line: 11 },
  ]);
});

test('counts literal MDX headings in document order, including JSX expressions', () => {
  const content = [
    '# Title',
    '',
    '<h2 id="usage">Usage</h2>',
    '',
    '<section>',
    '',
    '### Markdown child',
    '',
    '<h4>Detail</h4>',
    '',
    '</section>',
    '',
    '{true && <h5>Conditional heading</h5>}',
    '',
    'export const example = "<h6>string</h6>";',
  ].join('\n');
  assert.deepEqual(extractHeadings(en, content), [
    { depth: 1, line: 1 },
    { depth: 2, line: 3 },
    { depth: 3, line: 7 },
    { depth: 4, line: 9 },
    { depth: 5, line: 13 },
  ]);
});

test('ignores MDX comments, fenced examples and import-only component references', () => {
  assert.deepEqual(
    extractHeadings(
      en,
      [
        "import APIReference from './Example-API.mdx';",
        '',
        '# Title',
        '',
        '{/* <h2>Comment</h2> */}',
        '',
        '```mdx',
        '## Example',
        '<h3>Example</h3>',
        '```',
        '',
        '<APIReference />',
      ].join('\n'),
    ),
    [{ depth: 1, line: 3 }],
  );
});

test('treats a fallback frontmatter title and explicit H1 as equivalent', () => {
  const implicit = '---\ntitle: Title\n---\n\n## Usage {#usage}';
  const explicit = '# 标题\n\n## 用法 {#usage}';
  assert.deepEqual(check(implicit, explicit).violations, []);
  for (const newline of ['\n', '\r\n']) {
    assert.deepEqual(extractHeadings(en, implicit.replaceAll('\n', newline)), [
      { depth: 1, line: 1 },
      { depth: 2, line: 5 },
    ]);
  }
});

test('does not double-count titles or hide extra H1 headings', () => {
  assert.equal(
    extractHeadings(en, '---\ntitle: Title\n---\n\n# Title\n\n## Usage').length,
    2,
  );
  assert.equal(
    check('# Title\n\n# Extra\n\n## Usage', '# 标题\n\n## 用法').violations
      .length,
    1,
  );
  // Rspress discovers headingTitle from Markdown, so a literal JSX H1 does
  // not suppress the frontmatter fallback rendered before the document.
  assert.equal(
    extractHeadings(en, '---\ntitle: Title\n---\n\n<h1>Title</h1>').length,
    2,
  );
});

test('preserves Markdown semantics and never evaluates frontmatter or MDX code', () => {
  assert.deepEqual(
    extractHeadings(
      en.replace('.mdx', '.md'),
      '# Title\n\nimport X from "./x"\n\n## Usage',
    ).map(({ depth }) => depth),
    [1, 2],
  );
  assert.deepEqual(
    extractHeadings(
      en,
      [
        '---javascript',
        "(() => { throw new Error('must not execute metadata'); })()",
        '---',
        '',
        "export const crash = (() => { throw new Error('must not execute code'); })();",
        '',
        '# Title',
      ].join('\n'),
    ),
    [{ depth: 1, line: 7 }],
  );
});

test('allows only explicitly listed differing pairs with documented reasons', () => {
  const allowlist = new Set([pair.key]);
  assert.deepEqual(check('# Title', '# 标题\n\n## 用法', allowlist), {
    violations: [],
    allowed: [pair.key],
  });
  assert.equal(check('# Title', '# 标题\n\n## 用法').violations.length, 1);
  assert.deepEqual(
    [...headingParityAllowlist],
    Object.keys(headingExceptions.parity),
  );
  for (const reason of Object.values(headingExceptions.parity)) {
    assert.ok(reason.trim().length > 0);
  }
});

test('requires removal of aligned, deleted or renamed allowlist entries', () => {
  const allowlist = new Set([pair.key]);
  assert.match(
    check('# Title', '# 标题', allowlist).violations[0].reason,
    /remove stale allowlist entry/,
  );
  assert.match(
    checkHeadingParity([], () => '', allowlist).violations[0].reason,
    /document pair no longer exists/,
  );
});

test('read and parse failures fail even for an allowlisted pair', () => {
  const invalid = "import X from './x'\nconst invalid = 1";
  const result = check(invalid, '# 标题', new Set([pair.key]));
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].file, en);
  assert.equal(result.violations[0].line, 2);
  assert.match(result.violations[0].reason, /could not read or parse/);
  assert.deepEqual(result.allowed, []);
  const unreadable = checkHeadingParity(
    [pair],
    () => {
      throw new Error('unreadable fixture');
    },
    new Set([pair.key]),
  );
  assert.equal(unreadable.violations.length, 2);
});

test('CLI scans tracked pairs, reports both locations, and ignores generated output', (t) => {
  // Keep all temporary inputs in the ignored investigation directory.
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const scratchRoot = path.join(root, '.reference');
  mkdirSync(scratchRoot, { recursive: true });
  const directory = mkdtempSync(path.join(scratchRoot, 'heading-parity-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(path.join(directory, 'scripts/ci'), { recursive: true });
  for (const name of [
    'check-doc-heading-parity.mjs',
    'documentation-parser.mjs',
    'doc-heading-allowlist.json',
  ]) {
    writeFileSync(
      path.join(directory, 'scripts/ci', name),
      readFileSync(new URL(name, import.meta.url)),
    );
  }
  const script = path.join(
    directory,
    'scripts/ci/check-doc-heading-parity.mjs',
  );
  function git(...args) {
    const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  function write(file, content) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), content);
  }
  git('init', '--quiet');
  for (const key of headingParityAllowlist) {
    const enFile = key.startsWith('sharedDocs/')
      ? key + '.mdx'
      : key.replace('docs/', 'docs/en/') + '.mdx';
    const zhFile = key.startsWith('sharedDocs/')
      ? key + '.zh.mdx'
      : key.replace('docs/', 'docs/zh/') + '.mdx';
    write(enFile, '# Title');
    write(zhFile, '# 标题\n\n## API');
  }
  write(en, '# Title\n\n## Usage');
  write(zh, '# 标题\n\n### 用法');
  git('add', 'docs', 'sharedDocs');
  write('docs/en/generated.mdx', '# Generated\n\n## Only English');
  write('docs/zh/generated.mdx', '# 生成页面');
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 30_000,
    });
  const failed = run();
  assert.equal(failed.status, 1);
  assert.match(
    failed.stdout,
    new RegExp(
      `Checked ${headingParityAllowlist.size + 1} English/Chinese document pairs; ${headingParityAllowlist.size} known exceptions`,
    ),
  );
  assert.match(failed.stderr, /heading hierarchy differs/);
  assert.match(failed.stderr, /docs\/en\/guide\/example.mdx:3/);
  assert.match(failed.stderr, /docs\/zh\/guide\/example.mdx:3/);
  write(zh, '# 标题\n\n## 用法');
  const passed = run();
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(passed.stderr, '');
  const invalidArguments = run(en);
  assert.equal(invalidArguments.status, 1);
  assert.match(invalidArguments.stderr, /full scan without file arguments/);
});
