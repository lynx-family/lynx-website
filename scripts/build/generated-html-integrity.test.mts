import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { assertNoNullCharacters } from './generated-html-integrity.mts';

test('accepts Unicode HTML and literal NUL escape examples', () => {
  assert.doesNotThrow(() =>
    assertNoNullCharacters(
      '<h2 id="形式语法">形式语法 → 😀</h2><code>\\u0000</code>',
      'zh/guide.html',
    ),
  );
});

test('reports the output path and first NUL position before cleanup', () => {
  assert.throws(
    () =>
      assertNoNullCharacters(
        '<main>\n<h2 id="\u0000形式语法">形式语法</h2>',
        'zh/guide.html',
      ),
    /zh\/guide\.html:2:9: generated HTML contains U\+0000/,
  );
});

// Exercise the installed dependency rather than copying React's buffer logic.
// Separate processes select the development and production server entries.
for (const environment of ['development', 'production']) {
  test(`preserves Unicode across streamed SSR buffers in ${environment}`, () => {
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
          import assert from 'node:assert/strict';
          import { PassThrough } from 'node:stream';
          import { text } from 'node:stream/consumers';
          import React from 'react';
          import { renderToPipeableStream, renderToString } from 'react-dom/server';

          for (const value of ['形式语法', '日本語', '→ 😀']) {
            const app = React.createElement(
              'main',
              null,
              Array.from({ length: 600 }, (_, index) =>
                React.createElement(
                  'h2',
                  { key: index, id: 'heading-' + index + '-' + value },
                  value + ' UTF-8 boundary ' + index,
                ),
              ),
            );
            const actual = await new Promise((resolve, reject) => {
              const output = new PassThrough();
              const { pipe } = renderToPipeableStream(app, {
                progressiveChunkSize: Infinity,
                onAllReady() {
                  pipe(output);
                  text(output).then(resolve, reject);
                },
                onError: reject,
              });
            });
            assert.equal(actual, renderToString(app), value);
            assert.equal(actual.includes('\\u0000'), false, value);
          }
        `,
      ],
      {
        env: { ...process.env, NODE_ENV: environment },
        stdio: 'pipe',
      },
    );
  });
}
