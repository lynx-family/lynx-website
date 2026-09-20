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
    }
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts/lynx-example.js')],
      {
        cwd: temporary,
        env: {
          ...process.env,
          EXAMPLES_DIR: 'examples',
          LINK_PATH: 'output',
          REMOVE_LINK_PATH: 'false',
          NATIVE_FRAMEWORK: 'lynxtron',
          EXAMPLE_GIT_BASE_URL:
            'https://github.com/lynx-community/lynxtron-examples/tree/main',
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
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
