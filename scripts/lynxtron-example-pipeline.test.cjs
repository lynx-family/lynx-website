const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

test('Lynxtron examples use the source-specific pipeline and blog references', () => {
  const generic = readJSON(
    path.join(root, 'packages/lynx-example-packages/package.json'),
  );
  assert.ok(
    !JSON.stringify(generic.dependencies).includes('lynxtron-examples'),
  );
  const dedicated = readJSON(
    path.join(root, 'packages/lynxtron-example-packages/package.json'),
  );
  assert.equal(Object.keys(dedicated.dependencies).length, 8);
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'lynxtron-pipeline-'),
  );
  try {
    for (const name of Object.keys(dedicated.dependencies)) {
      const example = name.split('/')[1];
      const directory = path.join(temporary, 'examples', example);
      fs.mkdirSync(path.join(directory, 'dist_precompiled/web'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ name, version: '1.0.0' }),
      );
      fs.writeFileSync(
        path.join(directory, 'dist_precompiled/web/index.html'),
        '<html></html>',
      );
      fs.writeFileSync(path.join(directory, 'main.lynx.bundle'), 'fixture');
      if (example === 'native-texture-canvas') {
        const native = path.join(directory, 'native-texture-extension');
        fs.mkdirSync(native);
        for (const file of [
          'module.cc',
          'module.h',
          'surface.mm',
          'CMakeLists.txt',
        ]) {
          fs.writeFileSync(path.join(native, file), `source fixture: ${file}`);
        }
      }
    }
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts/lynxtron-examples.js')],
      {
        cwd: temporary,
        env: {
          ...process.env,
          EXAMPLES_DIR: 'examples',
          LINK_PATH: 'output',
        },
      },
    );
    for (const language of ['en', 'zh']) {
      const blog = fs.readFileSync(
        path.join(root, `docs/${language}/blog/lynxtron.mdx`),
        'utf8',
      );
      const examples = [...blog.matchAll(/example="([^"]+)"/g)].map(
        (match) => match[1],
      );
      assert.deepEqual(examples, [
        'benchmark',
        'native-texture-canvas',
        'cross-platform-notes',
      ]);
      for (const example of examples) {
        const metadata = readJSON(
          path.join(temporary, 'output', example, 'example-metadata.json'),
        );
        assert.equal(metadata.nativeFramework, 'lynxtron');
        if (example === 'native-texture-canvas') {
          for (const file of [
            'module.cc',
            'module.h',
            'surface.mm',
            'CMakeLists.txt',
          ]) {
            const source = `native-texture-extension/${file}`;
            assert.ok(metadata.files.includes(source));
            assert.equal(
              fs.readFileSync(
                path.join(temporary, 'output', example, source),
                'utf8',
              ),
              `source fixture: ${file}`,
            );
          }
        }
        assert.match(
          metadata.exampleGitBaseUrl,
          /lynx-community\/lynxtron-examples/,
        );
        if (example === 'cross-platform-notes') {
          assert.ok(
            metadata.templateFiles.some(
              (entry) =>
                entry.webHostFile === 'dist_precompiled/web/index.html',
            ),
          );
        }
      }
    }
    // The generic entry must not infer a Web host from a Lynxtron package.
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts/lynx-example.js')],
      {
        cwd: temporary,
        env: {
          ...process.env,
          EXAMPLES_DIR: 'examples',
          LINK_PATH: 'generic-output',
        },
      },
    );
    const genericMetadata = readJSON(
      path.join(
        temporary,
        'generic-output/cross-platform-notes/example-metadata.json',
      ),
    );
    assert.ok(
      genericMetadata.templateFiles.every((entry) => !entry.webHostFile),
    );

    // An unrelated package with the same directory name must not get the host.
    fs.writeFileSync(
      path.join(temporary, 'examples/cross-platform-notes/package.json'),
      JSON.stringify({ name: '@other/cross-platform-notes', version: '1.0.0' }),
    );
    fs.writeFileSync(
      path.join(temporary, 'output/keep.txt'),
      'existing example',
    );
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts/lynxtron-examples.js')],
      {
        cwd: temporary,
        env: { ...process.env, EXAMPLES_DIR: 'examples', LINK_PATH: 'output' },
      },
    );
    const unrelated = readJSON(
      path.join(temporary, 'output/cross-platform-notes/example-metadata.json'),
    );
    assert.ok(unrelated.templateFiles.every((entry) => !entry.webHostFile));
    assert.equal(
      fs.readFileSync(path.join(temporary, 'output/keep.txt'), 'utf8'),
      'existing example',
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
