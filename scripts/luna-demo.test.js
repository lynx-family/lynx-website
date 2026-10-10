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

function runLuna(cwd, sourceDir) {
  return execFileSync(
    process.execPath,
    [path.join(__dirname, 'luna-demo.js')],
    {
      cwd,
      env: {
        ...process.env,
        LINK_PATH: 'output',
        LUNA_SOURCE_DIR: path.relative(cwd, sourceDir),
      },
    },
  );
}

test('rejects different owners for the same incoming output ID', (t) => {
  const root = makeTempDir(t);
  const sourceRoot = path.join(root, 'node_modules');
  const outputRoot = path.join(root, 'output');

  writeLunaPackage(path.join(sourceRoot, '@alpha', 'demo'), '@alpha/demo');
  writeLunaPackage(path.join(sourceRoot, '@beta', 'demo'), '@beta/demo');
  fs.mkdirSync(outputRoot);
  fs.writeFileSync(path.join(outputRoot, 'keep.txt'), 'existing output');

  assert.throws(
    () => runLuna(root, sourceRoot),
    /output ID collision.*@(?:alpha|beta)\/demo.*@(?:alpha|beta)\/demo/,
  );
  assert.equal(fs.existsSync(path.join(outputRoot, 'demo')), false);
  assert.equal(
    fs.readFileSync(path.join(outputRoot, 'keep.txt'), 'utf8'),
    'existing output',
  );
});

test('preflights every package against existing outputs before copying', (t) => {
  const root = makeTempDir(t);
  const sourceRoot = path.join(root, 'packages');
  const outputRoot = path.join(root, 'output');
  const firstSource = path.join(sourceRoot, 'first');
  const secondSource = path.join(sourceRoot, 'second');
  const firstOutput = path.join(outputRoot, 'first');
  const secondOutput = path.join(outputRoot, 'second');

  writeLunaPackage(firstSource, '@dugyu/first');
  writeLunaPackage(secondSource, '@dugyu/second');
  fs.mkdirSync(firstOutput, { recursive: true });
  fs.mkdirSync(secondOutput, { recursive: true });
  fs.writeFileSync(
    path.join(firstOutput, 'package.json'),
    JSON.stringify({ name: '@dugyu/first' }),
  );
  fs.writeFileSync(path.join(firstOutput, 'old.txt'), 'old output');
  fs.writeFileSync(
    path.join(secondOutput, 'package.json'),
    JSON.stringify({ name: '@other/second' }),
  );

  assert.throws(
    () => runLuna(root, sourceRoot),
    /output ID collision.*@other\/second.*@dugyu\/second/,
  );
  assert.equal(
    fs.readFileSync(path.join(firstOutput, 'old.txt'), 'utf8'),
    'old output',
  );
  assert.equal(fs.existsSync(path.join(firstOutput, 'new.txt')), false);
});
