import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const website = join(dirname(fileURLToPath(import.meta.url)), '..');

test('sync runs as an installed dependency without a TypeScript loader', () => {
  const root = mkdtempSync(join(tmpdir(), 'lynx-doc-sync-'));
  try {
    const installed = join(root, 'node_modules/lynx-doc');
    const source = join(root, 'source');
    mkdirSync(join(installed, 'scripts'), { recursive: true });
    mkdirSync(join(installed, 'docs/en/api'), { recursive: true });
    mkdirSync(join(source, 'packages'), { recursive: true });
    for (const file of [
      'shared-subsite-routes.ts',
      'shared-api-package-subsites.json',
      'scripts/sync-lynx-stack-docs.mjs',
    ]) {
      cpSync(join(website, file), join(installed, file));
    }
    execFileSync('git', ['init', '--quiet', root]);
    writeFileSync(join(root, '.gitignore'), 'node_modules/\n');
    writeFileSync(
      join(installed, 'docs/en/api/_meta.json'),
      JSON.stringify([{ name: 'packages' }]),
    );
    const packages = [
      'background-only',
      'react-signals',
      'react-umd',
      'use-sync-external-store',
    ];
    for (const name of packages) {
      mkdirSync(join(source, 'packages', name));
      writeFileSync(join(source, 'packages', name, 'index.mdx'), `# ${name}\n`);
    }
    const items = packages.map((name) => ({ name, label: name }));
    writeFileSync(join(source, 'packages/_meta.json'), JSON.stringify(items));
    writeFileSync(
      join(source, 'manifest.json'),
      JSON.stringify({
        sections: [{ route: 'api/packages', content: { en: 'packages' } }],
        packages: packages.map((name) => ({ route: `api/packages/${name}` })),
        shownPackages: [{ group: 'Libraries', packages }],
      }),
    );
    execFileSync(
      process.execPath,
      [join(installed, 'scripts/sync-lynx-stack-docs.mjs'), source],
      { cwd: root },
    );
    assert.equal(
      readFileSync(
        join(installed, 'docs/en/api/packages/react-signals/index.mdx'),
        'utf8',
      ),
      '# react-signals\n',
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
