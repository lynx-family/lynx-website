const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { getTemplateFiles } = require('./lynx-example.js');
const {
  assertExampleOutputOwnership,
} = require('./example-output-ownership.js');

function makeTempDir(t, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writePackage(directory, name, manifest = {}) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name, ...manifest }),
  );
}

test('uses the shortest unique path suffix for duplicate entry basenames', () => {
  assert.deepEqual(
    getTemplateFiles([
      'dist/a/main.lynx.bundle',
      'dist/a/main.web.bundle',
      'output/a/main.lynx.bundle',
      'output/a/main.web.bundle',
      'other/b/main.lynx.bundle',
    ]),
    [
      {
        name: 'dist/a/main',
        file: 'dist/a/main.lynx.bundle',
        webFile: 'dist/a/main.web.bundle',
      },
      {
        name: 'output/a/main',
        file: 'output/a/main.lynx.bundle',
        webFile: 'output/a/main.web.bundle',
      },
      {
        name: 'b/main',
        file: 'other/b/main.lynx.bundle',
      },
    ],
  );
});

test('rejects template entry names that cannot be made unique', () => {
  assert.throws(
    () => getTemplateFiles(['dist/main.lynx.bundle', 'dist/main.lynx.bundle']),
    /Could not create unique template entry names/,
  );
});

test('rejects different package owners for the same output ID', (t) => {
  const root = makeTempDir(t, 'example-owner-');
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');

  writePackage(sourceDir, '@lynxtron-examples/browser');
  writePackage(targetDir, '@lynx-example/browser');

  assert.throws(
    () => assertExampleOutputOwnership(sourceDir, targetDir, 'browser'),
    /output ID collision.*@lynx-example\/browser.*@lynxtron-examples\/browser/,
  );
});

test('rejects a source package without an owner', (t) => {
  const root = makeTempDir(t, 'example-owner-');
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');

  fs.mkdirSync(sourceDir);
  fs.mkdirSync(targetDir);
  fs.writeFileSync(path.join(sourceDir, 'package.json'), '{}');

  assert.throws(
    () => assertExampleOutputOwnership(sourceDir, targetDir, 'view'),
    /no valid source package owner/,
  );
});

test('allows the same package owner to refresh an output ID', (t) => {
  const root = makeTempDir(t, 'example-owner-');
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');

  writePackage(sourceDir, '@lynx-example/view');
  writePackage(targetDir, '@lynx-example/view');

  const before = fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8');
  assert.doesNotThrow(() =>
    assertExampleOutputOwnership(sourceDir, targetDir, 'view'),
  );
  assert.doesNotThrow(() =>
    assertExampleOutputOwnership(sourceDir, targetDir, 'view'),
  );
  assert.equal(
    fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'),
    before,
  );
});

test('treats an unowned target as disposable without mutating it', (t) => {
  const root = makeTempDir(t, 'example-owner-');
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');

  writePackage(sourceDir, '@lynx-example/view');
  fs.mkdirSync(targetDir);
  fs.writeFileSync(path.join(targetDir, 'stale.txt'), 'stale output');

  assert.doesNotThrow(() =>
    assertExampleOutputOwnership(sourceDir, targetDir, 'view'),
  );
  assert.equal(
    fs.readFileSync(path.join(targetDir, 'stale.txt'), 'utf8'),
    'stale output',
  );
});

test('replaces an unowned incomplete output with a known source owner', (t) => {
  const root = makeTempDir(t, 'lynx-example-incomplete-');
  const sourceDir = path.join(root, 'fixtures', 'examples');
  const sourceExampleDir = path.join(sourceDir, 'view');
  const outputDir = path.join(root, 'production', 'output');
  const outputExampleDir = path.join(outputDir, 'view');

  writePackage(sourceExampleDir, '@lynx-example/view');
  fs.mkdirSync(outputExampleDir, { recursive: true });
  fs.writeFileSync(path.join(sourceExampleDir, 'new.txt'), 'new output');
  fs.writeFileSync(path.join(outputExampleDir, 'stale.txt'), 'stale output');

  execFileSync(process.execPath, [path.join(__dirname, 'lynx-example.js')], {
    cwd: root,
    env: {
      ...process.env,
      EXAMPLES_DIR: path.relative(root, sourceDir),
      LINK_PATH: path.relative(root, outputDir),
      REMOVE_LINK_PATH: 'false',
    },
  });

  assert.equal(fs.existsSync(path.join(outputExampleDir, 'stale.txt')), false);
  assert.equal(
    fs.readFileSync(path.join(outputExampleDir, 'new.txt'), 'utf8'),
    'new output',
  );
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(path.join(outputExampleDir, 'package.json'), 'utf8'),
    ),
    { name: '@lynx-example/view' },
  );
});

test('preflights all incremental owners before copying examples', (t) => {
  const root = makeTempDir(t, 'lynx-example-preflight-');
  const sourceDir = path.join(root, 'fixtures', 'examples');
  const outputDir = path.join(root, 'production', 'output');
  const firstSourceDir = path.join(sourceDir, 'first');
  const secondSourceDir = path.join(sourceDir, 'second');
  const firstOutputDir = path.join(outputDir, 'first');
  const secondOutputDir = path.join(outputDir, 'second');

  writePackage(firstSourceDir, '@lynx-example/first');
  writePackage(secondSourceDir, '@lynx-example/second');
  writePackage(firstOutputDir, '@lynx-example/first');
  writePackage(secondOutputDir, '@other/second');
  fs.writeFileSync(path.join(firstSourceDir, 'new.txt'), 'new first');
  fs.writeFileSync(path.join(secondSourceDir, 'new.txt'), 'new second');
  fs.writeFileSync(path.join(firstOutputDir, 'old.txt'), 'old first');
  fs.writeFileSync(path.join(secondOutputDir, 'old.txt'), 'old second');
  fs.writeFileSync(path.join(outputDir, 'keep.txt'), 'keep output');

  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [path.join(__dirname, 'lynx-example.js')],
        {
          cwd: root,
          env: {
            ...process.env,
            EXAMPLES_DIR: path.relative(root, sourceDir),
            LINK_PATH: path.relative(root, outputDir),
            REMOVE_LINK_PATH: 'false',
          },
        },
      ),
    /output ID collision.*@other\/second.*@lynx-example\/second/,
  );

  assert.equal(
    fs.readFileSync(path.join(firstOutputDir, 'old.txt'), 'utf8'),
    'old first',
  );
  assert.equal(
    fs.readFileSync(path.join(secondOutputDir, 'old.txt'), 'utf8'),
    'old second',
  );
  assert.equal(
    fs.readFileSync(path.join(outputDir, 'keep.txt'), 'utf8'),
    'keep output',
  );
  assert.equal(fs.existsSync(path.join(firstOutputDir, 'new.txt')), false);
});

test('full rebuild discards stale owners from a previous scope', (t) => {
  const root = makeTempDir(t, 'lynx-example-rebuild-');
  const sourceDir = path.join(root, 'fixtures', 'examples');
  const sourceExampleDir = path.join(sourceDir, 'view');
  const outputDir = path.join(root, 'production', 'output');
  const outputExampleDir = path.join(outputDir, 'view');

  writePackage(sourceExampleDir, '@new-scope/view');
  writePackage(outputExampleDir, '@old-scope/view');
  fs.writeFileSync(path.join(sourceExampleDir, 'new.txt'), 'new output');
  fs.writeFileSync(path.join(outputExampleDir, 'old.txt'), 'old output');

  execFileSync(process.execPath, [path.join(__dirname, 'lynx-example.js')], {
    cwd: root,
    env: {
      ...process.env,
      EXAMPLES_DIR: path.relative(root, sourceDir),
      LINK_PATH: path.relative(root, outputDir),
    },
  });

  assert.equal(fs.existsSync(path.join(outputExampleDir, 'old.txt')), false);
  assert.equal(
    fs.readFileSync(path.join(outputExampleDir, 'new.txt'), 'utf8'),
    'new output',
  );
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(outputExampleDir, 'package.json'), 'utf8'),
    ).name,
    '@new-scope/view',
  );
});

test('Windows relative paths produce POSIX metadata and match the Web host', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lynx-example-win-'));
  try {
    const exampleDir = path.join(root, 'examples', 'notes');
    fs.mkdirSync(path.join(exampleDir, 'dist_precompiled', 'web'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(exampleDir, 'package.json'),
      JSON.stringify({ name: '@lynxtron-examples/cross-platform-notes' }),
    );
    fs.writeFileSync(path.join(exampleDir, 'main.lynx.bundle'), 'bundle');
    fs.writeFileSync(
      path.join(exampleDir, 'dist_precompiled', 'web', 'index.html'),
      '<html></html>',
    );
    const module = { exports: {} };
    // Keep filesystem operations native, but emulate Windows path.relative/sep.
    const windowsMetadataPath = {
      ...path,
      sep: '\\',
      relative: (from, to) =>
        path.relative(from, to).split(path.sep).join('\\'),
    };
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, 'lynx-example.js'), 'utf8'),
      {
        module,
        require: (name) => {
          if (name === 'fs') return fs;
          if (name === 'path') return windowsMetadataPath;
          if (name === './example-output-ownership') {
            return {
              assertExampleOutputOwnership: () => {},
              assertExampleSourceOwnership: () => {},
            };
          }
          throw new Error(`Unexpected import: ${name}`);
        },
        process: { cwd: () => root, env: { LINK_PATH: 'output' } },
        console,
      },
    );
    module.exports.parseExampleData({
      examplesDir: path.join(root, 'examples'),
      webHostFiles: {
        '@lynxtron-examples/cross-platform-notes':
          'dist_precompiled/web/index.html',
      },
    });
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(root, 'output', 'notes', 'example-metadata.json'),
        'utf8',
      ),
    );
    assert.ok(metadata.files.includes('dist_precompiled/web/index.html'));
    assert.ok(metadata.files.every((file) => !file.includes('\\')));
    assert.ok(
      metadata.templateFiles.some(
        (entry) => entry.webHostFile === 'dist_precompiled/web/index.html',
      ),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('copies example assets without external commands', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lynx-example-'));
  const examplesDir = path.join(root, 'packages');
  const exampleDir = path.join(examplesDir, 'example $(touch owned)');
  const outputDir = path.join(root, 'public');

  try {
    fs.mkdirSync(path.join(exampleDir, 'dist', 'node_modules'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(exampleDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(exampleDir, '.git'), { recursive: true });
    fs.writeFileSync(
      path.join(exampleDir, 'package.json'),
      JSON.stringify({
        name: '@lynx-example/test',
        repository: { directory: 'examples/test' },
      }),
    );
    fs.writeFileSync(
      path.join(exampleDir, 'dist', 'main.lynx.bundle'),
      'bundle',
    );
    fs.writeFileSync(
      path.join(exampleDir, 'dist', 'node_modules', 'native.node'),
      'excluded',
    );
    fs.writeFileSync(path.join(exampleDir, 'src', 'App.tsx'), 'source');
    fs.writeFileSync(path.join(exampleDir, '.git', 'config'), 'excluded');
    fs.writeFileSync(path.join(exampleDir, 'LICENSE'), 'excluded');
    fs.symlinkSync('src/App.tsx', path.join(exampleDir, 'linked.tsx'));

    execFileSync(process.execPath, [path.join(__dirname, 'lynx-example.js')], {
      cwd: root,
      env: {
        ...process.env,
        EXAMPLES_DIR: path.relative(root, examplesDir),
        LINK_PATH: path.relative(root, outputDir),
        PATH: '',
      },
    });

    const generatedDir = path.join(outputDir, path.basename(exampleDir));
    assert.equal(
      fs.readFileSync(path.join(generatedDir, 'src', 'App.tsx'), 'utf8'),
      'source',
    );
    assert.equal(
      fs.readFileSync(path.join(generatedDir, 'linked.tsx'), 'utf8'),
      'source',
    );
    assert.equal(
      fs.existsSync(path.join(generatedDir, 'dist', 'node_modules')),
      false,
    );
    assert.equal(fs.existsSync(path.join(generatedDir, '.git')), false);
    assert.equal(fs.existsSync(path.join(generatedDir, 'LICENSE')), false);
    assert.equal(fs.existsSync(path.join(root, 'owned')), false);

    const metadata = JSON.parse(
      fs.readFileSync(path.join(generatedDir, 'example-metadata.json'), 'utf8'),
    );
    assert.equal(metadata.name, 'examples/test');
    assert.deepEqual(metadata.templateFiles, [
      { name: 'main', file: 'dist/main.lynx.bundle' },
    ]);
    assert.equal(
      metadata.files.some((file) => file.includes('node_modules')),
      false,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
