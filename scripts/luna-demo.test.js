const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

function makeTempDir(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'luna-owner-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writeLunaPackage(directory, owner) {
  fs.mkdirSync(path.join(directory, 'dist'), { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: owner }),
  );
  fs.writeFileSync(path.join(directory, 'dist', 'main.web.bundle'), 'bundle');
  fs.writeFileSync(path.join(directory, 'new.txt'), 'new output');
}

function runLuna(cwd, sourceDir, linkPath = 'output') {
  const env = {
    ...process.env,
    LINK_PATH: linkPath,
    // Empty PATH models deployment images without undeclared host tools such as rsync.
    PATH: '',
  };
  delete env.LUNA_SOURCE_DIR;
  if (sourceDir) {
    env.LUNA_SOURCE_DIR = path.relative(cwd, sourceDir);
  }

  return execFileSync(
    process.execPath,
    [path.join(__dirname, 'luna-demo.js')],
    {
      cwd,
      stdio: 'pipe',
      env,
    },
  );
}

test('preflights every package against existing outputs before copying', (t) => {
  const root = makeTempDir(t);
  const sourceRoot = path.join(root, 'packages');
  const outputRoot = path.join(root, 'output');
  const firstSource = path.join(sourceRoot, 'first');
  const secondSource = path.join(sourceRoot, 'second');
  const firstOutput = path.join(outputRoot, 'first');
  const secondOutput = path.join(outputRoot, 'second');

  writeLunaPackage(firstSource, '@test-fixtures/first');
  writeLunaPackage(secondSource, '@test-fixtures/second');
  fs.mkdirSync(firstOutput, { recursive: true });
  fs.mkdirSync(secondOutput, { recursive: true });
  fs.writeFileSync(
    path.join(firstOutput, 'package.json'),
    JSON.stringify({ name: '@test-fixtures/first' }),
  );
  fs.writeFileSync(path.join(firstOutput, 'old.txt'), 'old output');
  fs.writeFileSync(
    path.join(secondOutput, 'package.json'),
    JSON.stringify({ name: '@other/second' }),
  );

  assert.throws(
    () => runLuna(root, sourceRoot),
    /output ID collision.*@other\/second.*@test-fixtures\/second/,
  );
  assert.equal(
    fs.readFileSync(path.join(firstOutput, 'old.txt'), 'utf8'),
    'old output',
  );
  assert.equal(fs.existsSync(path.join(firstOutput, 'new.txt')), false);
});

test('rejects an output ID that escapes the configured output root', (t) => {
  const root = makeTempDir(t);
  const sourceDir = path.join(root, 'fixtures', 'escape');
  const outputParent = path.join(root, 'production');
  const sentinel = path.join(outputParent, 'keep.txt');

  writeLunaPackage(sourceDir, '@test-fixtures/..');
  fs.mkdirSync(outputParent, { recursive: true });
  fs.writeFileSync(sentinel, 'keep output');

  assert.throws(
    () => runLuna(root, sourceDir, 'production/output'),
    /Invalid example output ID "\.\."/,
  );
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep output');
});
