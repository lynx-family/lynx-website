/**
 * Installed-package regression for the Lynx Stack documentation sync.
 *
 * This test packs the current repository, extracts the complete artifact into
 * a consumer's node_modules tree, and executes the packaged script there
 * without an explicit source. It catches files omitted from the package,
 * installed-package resolution failures, and runtime imports that work in a
 * checkout but fail under node_modules, including TypeScript imports that Node
 * refuses to strip for installed dependencies.
 *
 * Route classification behavior and its manifest compatibility are covered by
 * the theme and CI contract tests; this test owns only the published sync path.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { pageReferences, prunePackagePages } from './sync-lynx-stack-docs.mjs';

const website = join(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

test('sync runs from the package produced by pnpm pack', () => {
  const root = mkdtempSync(join(tmpdir(), 'lynx-doc-sync-'));
  try {
    // The regression must inspect the package without running root prepare,
    // which would generate unrelated site output before the test starts.
    const packOutput = execFileSync(
      pnpm,
      [
        '--config.ignore-scripts=true',
        'pack',
        '--pack-destination',
        root,
        '--json',
      ],
      { cwd: website, encoding: 'utf8' },
    );
    const packResult = JSON.parse(packOutput);
    const filename = Array.isArray(packResult)
      ? packResult[0].filename
      : packResult.filename;
    const tarball = isAbsolute(filename) ? filename : join(root, filename);

    const consumer = join(root, 'consumer');
    mkdirSync(consumer);
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify({ name: 'lynx-doc-sync-consumer', private: true }),
    );
    // The sync script requires generated sections to be ignored by Git. Model
    // the downstream contract instead of weakening that production guard.
    execFileSync('git', ['init', '--quiet'], { cwd: consumer });
    writeFileSync(join(consumer, '.gitignore'), 'node_modules/\n');

    const installed = join(consumer, 'node_modules/@lynx-js/lynx-doc');
    mkdirSync(installed, { recursive: true });
    // Extract the complete artifact so omitted package files fail the test.
    execFileSync(
      'tar',
      ['-xzf', tarball, '-C', installed, '--strip-components=1'],
      { cwd: consumer },
    );

    // Consumers execute pruning after their own overlays. Its parser must be
    // shipped with runtime dependencies, not only work in a development tree.
    for (const file of [
      'scripts/sync-lynx-stack-docs.mjs',
      'scripts/ci/documentation-parser.mjs',
    ]) {
      assert.ok(existsSync(join(installed, file)), `${file} is packaged`);
    }
    const packaged = JSON.parse(
      readFileSync(join(installed, 'package.json'), 'utf8'),
    );
    for (const name of [
      '@mdx-js/mdx',
      'gray-matter',
      'remark-cjk-friendly',
      'remark-cjk-friendly-gfm-strikethrough',
      'remark-gfm',
    ]) {
      assert.ok(
        packaged.dependencies[name],
        `${name} is available to consumers`,
      );
    }

    const source = join(consumer, 'node_modules/@lynx-js/lynx-stack-docs');
    const sourcePackages = join(source, 'packages');
    // A synthetic package that has no theme mapping proves the sync path is
    // independent of subsite classification. Its export models the installed
    // Lynx Stack docs package contract used by packageSource().
    mkdirSync(join(sourcePackages, 'fixture-package'), { recursive: true });
    writeFileSync(
      join(source, 'package.json'),
      JSON.stringify({
        name: '@lynx-js/lynx-stack-docs',
        version: '0.0.0',
        type: 'module',
        exports: { './manifest.json': './manifest.json' },
      }),
    );
    writeFileSync(
      join(sourcePackages, 'fixture-package/index.mdx'),
      '# Fixture package\n',
    );
    const items = [{ name: 'fixture-package', label: 'fixture-package' }];
    writeFileSync(join(sourcePackages, '_meta.json'), JSON.stringify(items));
    writeFileSync(
      join(source, 'manifest.json'),
      JSON.stringify({
        sections: [{ route: 'api/packages', content: { en: 'packages' } }],
        packages: [{ route: 'api/packages/fixture-package' }],
        shownPackages: [{ group: 'Libraries', packages: ['fixture-package'] }],
      }),
    );

    execFileSync(
      process.execPath,
      [join(installed, 'scripts/sync-lynx-stack-docs.mjs')],
      { cwd: consumer },
    );

    assert.equal(
      readFileSync(
        join(installed, 'docs/en/api/packages/fixture-package/index.mdx'),
        'utf8',
      ),
      '# Fixture package\n',
    );
    assert.deepEqual(
      JSON.parse(
        readFileSync(
          join(installed, 'docs/en/api/packages/_meta.json'),
          'utf8',
        ),
      ),
      items,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('retains shown packages and the recursive references of final site overlays', async () => {
  const root = mkdtempSync(join(tmpdir(), 'lynx-doc-prune-'));
  const docs = join(root, 'docs');
  const write = (file, text) => {
    mkdirSync(dirname(join(docs, file)), { recursive: true });
    writeFileSync(join(docs, file), text);
  };
  try {
    for (const locale of ['en', 'zh']) {
      const p = `${locale}/api/packages`;
      write(
        `${p}/shown/index.mdx`,
        '# Shown\n[Type](../hidden/Type.mdx#member)',
      );
      write(`${p}/shown/Unused.mdx`, '# Still shown');
      write(
        `${p}/hidden/Type.mdx`,
        '# Type\n[Recursive](../deep/Type.mdx?foo=bar)',
      );
      write(`${p}/deep/Type.mdx`, '# Type\n[Cycle](../hidden/Type.mdx)');
      write(`${p}/hidden/Unused.mdx`, '# Unused');
      write(
        `${p}/hidden/_meta.json`,
        JSON.stringify([{ name: 'Type' }, { name: 'Unused' }]),
      );
      write(`${p}/overlay/Type.mdx`, '# Overlay reference');
      write(`${p}/localized.mdx`, '# Localized root-relative target');
      write(`${p}/locale-only/Type.mdx`, '# Language counterpart');
      write(`${p}/spare/Type.mdx`, '# Not referenced');
      write(
        `${locale}/guide.mdx`,
        `[Overlay](/next/${locale === 'en' ? '' : 'zh/'}api/packages/overlay/Type.html)`,
      );
    }
    write(
      'zh/styling.mdx',
      '[Preset](/api/packages/localized)\n[Type](./api/packages/locale-only/Type.mdx)',
    );
    write(
      'en/api/build/index.mdx',
      '<a href="/api/packages/hidden/Type.html">Type</a>',
    );
    const result = await prunePackagePages({
      docs,
      manifest: {
        packages: [{ name: 'shown', route: 'api/packages/shown' }],
        shownPackages: [{ packages: ['shown'] }],
      },
    });
    assert.equal(result.before, 18);
    assert.equal(result.kept, 14);
    assert.equal(result.removed, 4);
    assert.ok(existsSync(join(docs, 'zh/api/packages/localized.mdx')));
    assert.ok(existsSync(join(docs, 'en/api/packages/locale-only/Type.mdx')));
    assert.ok(existsSync(join(docs, 'en/api/packages/deep/Type.mdx')));
    assert.ok(!existsSync(join(docs, 'zh/api/packages/spare/Type.mdx')));
    assert.deepEqual(
      JSON.parse(readFileSync(join(docs, 'en/api/packages/hidden/_meta.json'))),
      [{ name: 'Type' }],
    );
    assert.equal(
      (
        await prunePackagePages({
          docs,
          manifest: {
            packages: [{ name: 'shown', route: 'api/packages/shown' }],
            shownPackages: [{ packages: ['shown'] }],
          },
        })
      ).removed,
      0,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('reads reference definitions, static JSX expressions, and MDX imports, not fenced examples', async () => {
  const refs = await pageReferences(
    'page.mdx',
    '[Type][type]\n\n[type]: ./Type.mdx\n\n<a href={"./JSX.mdx"}>Type</a>\n\nimport Page from "./Imported.mdx"\n\n```md\n[Example](./Example.mdx)\n```',
  );
  for (const file of ['./Type.mdx', './JSX.mdx', './Imported.mdx'])
    assert.ok(refs.includes(file));
  assert.ok(!refs.includes('./Example.mdx'));
});

test('parse failures stop pruning before any page is deleted', async () => {
  const root = mkdtempSync(join(tmpdir(), 'lynx-doc-prune-invalid-'));
  try {
    mkdirSync(join(root, 'en/api/packages/hidden'), { recursive: true });
    writeFileSync(
      join(root, 'en/api/packages/hidden/index.mdx'),
      '# Keep until validation completes',
    );
    writeFileSync(join(root, 'en/index.mdx'), '<broken');
    await assert.rejects(() =>
      prunePackagePages({
        docs: root,
        manifest: { packages: [], shownPackages: [] },
      }),
    );
    assert.ok(existsSync(join(root, 'en/api/packages/hidden/index.mdx')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
