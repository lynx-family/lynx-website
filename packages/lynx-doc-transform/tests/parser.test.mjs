import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compileDocumentation,
  parseDocumentation,
  parseDocumentationCode,
  prepareDocumentation,
} from '@lynx-js/lynx-doc-transform/parser';

test('prepares source without losing original code positions', async (t) => {
  for (const newline of ['\n', '\r\n']) {
    await t.test(JSON.stringify(newline), () => {
      const source = [
        '\uFEFF---',
        'title: 示例 😀',
        '---',
        '# 中文 😀 {#id}',
        '',
        '> - ``code {versionJson.LYNX_VERSION}``',
        '',
        '~~~txt title="{versionJson.PRIMJS_VERSION}"',
        '中文 😀 {versionJson.PRIMJS_VERSION}',
        '~~~',
      ].join(newline);
      const { value, segments } = prepareDocumentation(source);
      assert.ok(value.includes('\\{#id}'));
      assert.ok(!value.includes('title: 示例'));
      for (const segment of segments) {
        assert.equal(
          value.slice(segment.start, segment.end),
          source.slice(
            segment.originalStart,
            segment.originalStart + segment.end - segment.start,
          ),
        );
      }
      const { tree, ranges } = parseDocumentationCode('fixture.mdx', source);
      assert.deepEqual(tree, parseDocumentation('fixture.mdx', source));
      assert.deepEqual(
        ranges.map(({ start, end }) => source.slice(start, end)),
        [
          'code {versionJson.LYNX_VERSION}',
          '中文 😀 {versionJson.PRIMJS_VERSION}',
        ],
      );
    });
  }
});

test('recognizes only code content across Markdown containers', async (t) => {
  const cases = [
    ['fence', '```js meta\ncode\n```', ['code']],
    ['tilde fence', '~~~~txt\ncode\n~~~~', ['code']],
    ['indented', '    code\n\tmore', ['code', 'more']],
    ['blockquote', '> ```txt\n> code\n> ```', ['code']],
    ['list', '- ```txt\n  code\n  ```', ['code']],
    ['inline multiline', '` first\nsecond `', ['first', 'second']],
    ['escaped tick', '\\`not code\\`', []],
    ['unclosed fence', '```\ncode', ['code']],
    ['table', '| col |\n| --- |\n| `code` |', ['code']],
    ['heading insertion', '# `{#id}` and `other`', ['{#id}', 'other']],
    [
      'MDX expressions',
      'export const x = `js`;\n\n<X prop={`js`}>{`js`}</X>',
      [],
    ],
    ['MDX child', '<X>\n\n`code`\n\n</X>', ['code']],
    ['Markdown HTML', '<X prop="`code`">', []],
    ['MDX indented prose', '    text', []],
  ];
  for (const [name, source, expected] of cases) {
    await t.test(name, () => {
      const file =
        name === 'Markdown HTML' || name === 'indented'
          ? 'test.md'
          : 'test.mdx';
      const { tree, ranges } = parseDocumentationCode(file, source);
      assert.deepEqual(tree, parseDocumentation(file, source));
      assert.deepEqual(
        ranges.map(({ start, end }) => source.slice(start, end)),
        expected,
      );
    });
  }
});

test('matches Rspress preprocessing across multiple heading markers', () => {
  for (const first of [0, 1, 2, 3]) {
    for (const second of [0, 1, 2, 3]) {
      for (const third of [0, 1, 2, 3]) {
        const source = [
          `# First ${'\\'.repeat(first)}{#one} and ${'\\'.repeat(second)}{#two} and ${'\\'.repeat(third)}{#three}`,
          `## Next ${'\\'.repeat(second)}{#four} and ${'\\'.repeat(first)}{#five}`,
        ].join('\n');
        assert.equal(
          prepareDocumentation(source).value,
          source.replace(/(?:^|\n)#{1,6}(?!#).*/g, (heading) =>
            heading.replace('{#', '\\{#').replace('\\\\{#', '\\{#'),
          ),
          `heading escape counts: ${first}, ${second}, ${third}`,
        );
      }
    }
  }
});

test('maps code around inserted and removed heading escapes to original source', async (t) => {
  const cases = [
    [
      'plain heading markers',
      '# 中文 😀 {#id} `before` and \\\\{#literal} `after`',
      ['before', 'after'],
    ],
    [
      'markers inside inline code',
      '# 中文 😀 `pre {#id} mid \\\\{#literal} post`',
      ['pre ', '{#id} mid ', '\\{#literal} post'],
    ],
  ];
  for (const extension of ['md', 'mdx']) {
    for (const newline of ['\n', '\r\n']) {
      for (const [name, heading, contents] of cases) {
        await t.test(`${extension} ${JSON.stringify(newline)} ${name}`, () => {
          const source = [
            '\uFEFF---',
            'title: 示例 😀',
            '---',
            heading,
            '',
            '~~~txt',
            'runtime',
            '~~~',
            '',
            '# Next {#next}',
            '`later`',
          ].join(newline);
          const { value, segments } = prepareDocumentation(source);
          for (const segment of segments) {
            assert.equal(
              value.slice(segment.start, segment.end),
              source.slice(
                segment.originalStart,
                segment.originalStart + segment.end - segment.start,
              ),
            );
          }
          const file = `fixture.${extension}`;
          const { tree, ranges } = parseDocumentationCode(file, source);
          assert.deepEqual(tree, parseDocumentation(file, source));
          assert.equal(compileDocumentation(file, source).type, 'Program');
          assert.deepEqual(
            ranges,
            [...contents, 'runtime', 'later'].map((content) => ({
              start: source.indexOf(content),
              end: source.indexOf(content) + content.length,
              type: content === 'runtime' ? 'code' : 'inlineCode',
            })),
          );
        });
      }
    }
  }
});

test('preserves parser line numbers, heading escapes, and inert frontmatter', () => {
  const source =
    '---js\nthrow new Error("never execute");\n---\n# Heading {#id}\n\nimport X from "./x";\n';
  const tree = parseDocumentation('test.mdx', source);
  assert.equal(tree.children.at(-1).position.start.line, 6);
  assert.equal(compileDocumentation('test.mdx', source).type, 'Program');
  for (const heading of [
    '# Hi {#id}',
    '# Hi \\{#id}',
    '# Hi \\\\{#id}',
    '####### Hi {#id}',
  ]) {
    assert.equal(
      prepareDocumentation(heading).value,
      heading.replace(/(?:^|\n)#{1,6}(?!#).*/g, (value) =>
        value.replace('{#', '\\{#').replace('\\\\{#', '\\{#'),
      ),
    );
  }
  assert.throws(
    () => parseDocumentationCode('bad.mdx', '<X>'),
    /close|closing/,
  );
  assert.throws(() => parseDocumentationCode('bad.txt', '`x`'), /Unsupported/);
  assert.deepEqual(
    parseDocumentationCode('empty.md', '---\nx: 1\n---').ranges,
    [],
  );
  assert.deepEqual(parseDocumentationCode('next.md', 'prose').ranges, []);
});
