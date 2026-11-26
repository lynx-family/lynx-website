import assert from 'node:assert/strict';
import test from 'node:test';

import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';

import {
  applyVersionEdits,
  createVersionContext,
  resolveVersionBindings,
  transformVersionBindings,
} from '../src/version-bindings.mjs';

const lynx = '{versionJson.LYNX_VERSION}';
const primjs = '{versionJson.PRIMJS_VERSION}';
const context = createVersionContext({
  LYNX_VERSION: '4.2.0',
  PRIMJS_VERSION: '4.2.1',
});

test('resolves versions without changing other source bytes', async (t) => {
  for (const extension of ['md', 'mdx']) {
    for (const newline of ['\n', '\r\n']) {
      await t.test(`${extension} ${JSON.stringify(newline)}`, () => {
        const source = [
          '\uFEFF---',
          `title: "${lynx}"`,
          '---',
          `# 中文 😀 {#id} \`heading:${lynx}\` and \\\\{#literal}`,
          '',
          `\`org.lynx:lynx:${lynx}-rc.1\``,
          '',
          `> - ~~~~txt title="${primjs}"`,
          `>   中文 😀 pod '${lynx}'`,
          `>   runtime:${primjs}-debug ${lynx}`,
          '>   ~~~~',
          '',
          `<X value="${lynx}" />`,
          '',
          `export const js = "${primjs}";`,
          '',
          `Prose ${lynx}`,
        ].join(newline);
        const expected = source
          .replace(`heading:${lynx}`, 'heading:4.2.0')
          .replace(`org.lynx:lynx:${lynx}`, 'org.lynx:lynx:4.2.0')
          .replace(`pod '${lynx}'`, "pod '4.2.0'")
          .replace(
            `runtime:${primjs}-debug ${lynx}`,
            'runtime:4.2.1-debug 4.2.0',
          );
        const output = transformVersionBindings(
          `test.${extension}`,
          source,
          context,
        );
        assert.equal(output.code, expected);
        assert.deepEqual(
          transformVersionBindings(`test.${extension}`, expected, context),
          { code: expected },
        );
      });
    }
  }
});

test('handles code grammar without evaluating broader expressions', async (t) => {
  const cases = [
    ['inline', `\`\`${lynx}\`\``, '``4.2.0``', 'mdx'],
    ['indented', `    ${lynx}\n\t${primjs}`, '    4.2.0\n\t4.2.1', 'md'],
    [
      'table',
      `| h |\n| - |\n| \`${lynx}\` |`,
      '| h |\n| - |\n| `4.2.0` |',
      'mdx',
    ],
    ['unclosed', `~~~\n${lynx}`, '~~~\n4.2.0', 'mdx'],
    ['split token', '`{versionJson.\nLYNX_VERSION}`', undefined, 'mdx'],
    [
      'quoted container split',
      '> `{versionJson.\n> LYNX_VERSION}`',
      undefined,
      'mdx',
    ],
    [
      'no JS grammar',
      '`{ versionJson.LYNX_VERSION } {versionJson["LYNX_VERSION"]} {versionJson.LYNX_VERSION.toString()}`',
      undefined,
      'mdx',
    ],
    [
      'fence file metadata',
      `~~~txt file="./snippet" title="${lynx}"\n${primjs}\n~~~`,
      `~~~txt file="./snippet" title="${lynx}"\n4.2.1\n~~~`,
      'mdx',
    ],
    [
      'ESM template',
      'export const example = `' + lynx + '`;',
      undefined,
      'mdx',
    ],
    ['JSX expression', '<X value={`' + lynx + '`} />', undefined, 'mdx'],
  ];
  for (const [name, source, expected = source, extension] of cases) {
    await t.test(name, () => {
      assert.equal(
        transformVersionBindings(`test.${extension}`, source, context).code,
        expected,
      );
    });
  }
});

test('reports unknown and missing bindings at original source positions', () => {
  const source = `---\r\ntitle: Test\r\n---\r\n# Heading {#id}\r\n\r\n> \`😀 {versionJson.UNKNOWN}\``;
  assert.throws(
    () => transformVersionBindings('中文.mdx', source, context),
    /中文\.mdx:6:7: Unknown version binding: UNKNOWN/,
  );
  for (const value of [
    undefined,
    null,
    '',
    42,
    {},
    '4.2\nbad',
    '4`2',
    '4\\2',
  ]) {
    assert.throws(
      () =>
        transformVersionBindings(
          'test.md',
          `\`${lynx}\``,
          createVersionContext({ LYNX_VERSION: value }),
        ),
      /test\.md:1:2: Missing or invalid version value: LYNX_VERSION/,
    );
  }
  assert.throws(() => createVersionContext(null), /JSON object/);
  assert.throws(() => createVersionContext([]), /JSON object/);
  const metadata = { LYNX_VERSION: '4.2.0' };
  const snapshot = createVersionContext(metadata);
  metadata.LYNX_VERSION = '9.0.0';
  assert.equal(snapshot.LYNX_VERSION, '4.2.0');
  assert.ok(Object.isFrozen(snapshot));
  assert.deepEqual(
    resolveVersionBindings('test.mdx', 'No bindings', context),
    [],
  );
});

test('rejects stale or overlapping edits before producing output', () => {
  const source = `\`${lynx}\``;
  const [edit] = resolveVersionBindings('test.md', source, context);
  assert.equal(applyVersionEdits('test.md', source, [edit]).code, '`4.2.0`');
  for (const edits of [
    [edit, edit],
    [{ ...edit, start: -1 }],
    [{ ...edit, end: source.length + 1 }],
    [{ ...edit, end: edit.start }],
    [{ ...edit, start: 1.5 }],
    [{ ...edit, expected: 'wrong' }],
  ]) {
    assert.throws(
      () => applyVersionEdits('test.md', source, edits),
      /Invalid or overlapping/,
    );
  }
});

test('maps unchanged text and replacement starts to the original MDX', () => {
  const source = `---\ntitle: Test\n---\n# 中文 😀 {#id}\n\n\`${lynx}\` after`;
  const { code, map } = transformVersionBindings('/test.mdx', source, context);
  const trace = new TraceMap(map);
  assert.deepEqual(map.sourcesContent, [source]);
  for (const [generatedColumn, originalColumn] of [
    [1, 1],
    [
      code.split('\n')[5].indexOf('after'),
      source.split('\n')[5].indexOf('after'),
    ],
  ]) {
    const original = originalPositionFor(trace, {
      line: 6,
      column: generatedColumn,
    });
    assert.equal(original.source, '/test.mdx');
    assert.equal(original.line, 6);
    assert.equal(original.column, originalColumn);
  }
});
