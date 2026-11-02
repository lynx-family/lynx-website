import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';

import { resolveSdkSince } from '../../src/versioning/page-sdk-since';
import { validatePageSdkSince } from './page-sdk-since';

test('release metadata alone promotes a page, preserving its SDK requirement', () => {
  assert.deepEqual(resolveSdkSince('4.3', '4.2'), {
    since: '4.3',
    prerelease: true,
  });
  for (const stable of ['4.3', '4.4', '5.0']) {
    assert.deepEqual(resolveSdkSince('4.3', stable), {
      since: '4.3',
      prerelease: false,
    });
  }
  assert.equal(resolveSdkSince(undefined, '4.3'), null);
});

test('compares version components rather than decimals or strings', () => {
  assert.equal(resolveSdkSince('4.10', '4.9')?.prerelease, true);
  assert.equal(resolveSdkSince('4.9', '4.10')?.prerelease, false);
  assert.equal(resolveSdkSince('5.0', '4.99')?.prerelease, true);
});

test('rejects ambiguous or unsupported SDK versions', () => {
  for (const value of [
    4.3,
    null,
    false,
    '',
    'next',
    '4',
    '4.3.0',
    '4.3-beta.1',
    '04.3',
    '4.03',
    ' 4.3',
    '4.3\n',
    [],
    {},
    '9007199254740992.0',
  ]) {
    assert.throws(
      () => resolveSdkSince(value, '4.2'),
      /since must be a quoted/,
    );
    assert.throws(() => resolveSdkSince(undefined, value), /latestStable/);
  }
});

async function fixture(t: TestContext, documents: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'page-sdk-since-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files: string[] = [];
  for (const [name, content] of Object.entries(documents)) {
    const file = path.join(root, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
    files.push(file);
  }
  return { root, files };
}

const page = (since?: string) =>
  since === undefined ? '# Guide\n' : `---\nsince: ${since}\n---\n# Guide\n`;

test('validates route-page facts, including mixed Markdown formats and index routes', async (t) => {
  const { root, files } = await fixture(t, {
    'en/guide/released.md': page("'4.2'"),
    'zh/guide/released/index.mdx': page("'4.2'"),
    'en/guide/new.mdx': page("'4.3'"),
    'zh/guide/new.md': page("'4.3'"),
    'en/guide/unannotated.md': page(),
    'zh/guide/unannotated.md': page(),
    'en/guide/untranslated.md': page("'4.3'"),
  });
  await validatePageSdkSince(files, root, '4.2');
  await validatePageSdkSince(files, root, '4.3');
});

test('reports invalid metadata with the source filename', async (t) => {
  const { root, files } = await fixture(t, {
    'en/guide/numeric.md': page('4.10'),
    'zh/guide/invalid.md': page("'next'"),
    'en/guide/null.md': page('null'),
  });
  await assert.rejects(
    validatePageSdkSince(files, root, '4.2'),
    (error: Error) => {
      for (const file of files) assert.ok(error.message.includes(file));
      return true;
    },
  );
});

test('requires matching facts when both locale routes exist', async (t) => {
  for (const zhSince of ["'4.4'", undefined]) {
    const { root, files } = await fixture(t, {
      'en/guide/new.md': page("'4.3'"),
      'zh/guide/new.mdx': page(zhSince),
    });
    await assert.rejects(
      validatePageSdkSince(files, root, '4.2'),
      /must match/,
    );
  }
});

test('ignores non-guide sources and excluded fragments, without executing MDX', async (t) => {
  const { root, files } = await fixture(t, {
    'en/guide/new.mdx': `${page()}\nimport Fragment from './fragments/body.mdx';\n<Fragment />\n{throwUnexpected()}\n`,
    'en/guide/fragments/body.mdx': page('4.3'),
    'en/api/generated.mdx': page('4.3'),
    'en/react/guide.mdx': page('4.3'),
    'en/guide/script.mdx':
      '---javascript\nthrow new Error("must not execute")\n---\n# Guide\n',
  });
  // Only Rspress routes are supplied; importing a fragment does not enroll it.
  await validatePageSdkSince(
    files.filter((file) => !file.includes('/fragments/')),
    root,
    '4.2',
  );
});

test('rejects annotated layouts that cannot display the notice', async (t) => {
  const { root, files } = await fixture(t, {
    'en/guide/home.mdx': "---\npageType: home\nsince: '4.3'\n---\n",
  });
  await assert.rejects(validatePageSdkSince(files, root, '4.2'), /page layout/);
});
