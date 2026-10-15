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
