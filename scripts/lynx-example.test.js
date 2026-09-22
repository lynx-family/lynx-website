const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

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
      JSON.stringify({ repository: { directory: 'examples/test' } }),
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
