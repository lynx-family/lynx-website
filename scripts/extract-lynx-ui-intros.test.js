const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  collectIntros,
  generateIntros,
} = require('./extract-lynx-ui-intros.js');

const makeTempDir = (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lynx-ui-intros-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
};

const writePackage = (
  packagesDir,
  pkg,
  { name = `@lynx-js/${pkg}`, readme, readmeZh, dottedReadmeZh, docsReadmeZh },
) => {
  const packageDir = path.join(packagesDir, pkg);
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify({ name }),
  );

  const files = [
    ['README.md', readme],
    ['README_zh.md', readmeZh],
    ['README.zh.md', dottedReadmeZh],
    ['docs/README.zh.mdx', docsReadmeZh],
  ];
  for (const [relativePath, content] of files) {
    if (content === undefined) {
      continue;
    }
    const filePath = path.join(packageDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
};

test('collects introductions only from package-level readmes', (t) => {
  const packagesDir = makeTempDir(t);
  writePackage(packagesDir, 'lynx-ui-zeta', {
    readme: '# Zeta\n\nZeta English\nwrapped.\n\n## Install\n',
    readmeZh: '# Zeta\n\nZeta Chinese.\n',
  });
  writePackage(packagesDir, 'lynx-ui-alpha', {
    readme: '# Alpha\n\nAlpha English.\n',
    dottedReadmeZh: '# Alpha\n\nAlpha Chinese.\n',
  });
  writePackage(packagesDir, 'unrelated', {
    name: '@fixture/unrelated',
  });

  assert.deepEqual(collectIntros(packagesDir), {
    enIntros: {
      'lynx-ui-alpha': 'Alpha English.',
      'lynx-ui-zeta': 'Zeta English wrapped.',
    },
    zhIntros: {
      'lynx-ui-alpha': 'Alpha Chinese.',
      'lynx-ui-zeta': 'Zeta Chinese.',
    },
  });
});

test('rejects a docs-page fallback without changing existing output', (t) => {
  const root = makeTempDir(t);
  const packagesDir = path.join(root, 'packages');
  const outputPath = path.join(root, 'lynx-ui-intros.ts');
  fs.mkdirSync(packagesDir);
  fs.writeFileSync(outputPath, 'existing output\n');
  writePackage(packagesDir, 'lynx-ui-input-otp', {
    readme: '# InputOTP\n\nEnglish intro.\n',
    docsReadmeZh:
      '# InputOTP\n\n:::info\n\nThis is page guidance, not an intro.\n\n:::\n',
  });

  assert.throws(
    () => generateIntros(packagesDir, outputPath),
    /@lynx-js\/lynx-ui-input-otp.*missing Chinese introduction.*README_zh\.md or README\.zh\.md/s,
  );
  assert.equal(fs.readFileSync(outputPath, 'utf8'), 'existing output\n');
});

test('reports every missing or empty package introduction', (t) => {
  const packagesDir = makeTempDir(t);
  writePackage(packagesDir, 'lynx-ui-missing-en', {
    readmeZh: '# Missing English\n\nChinese intro.\n',
  });
  writePackage(packagesDir, 'lynx-ui-empty-zh', {
    readme: '# Empty Chinese\n\nEnglish intro.\n',
    readmeZh: '# Empty Chinese\n',
  });

  assert.throws(
    () => collectIntros(packagesDir),
    (error) => {
      assert.match(
        error.message,
        /@lynx-js\/lynx-ui-missing-en.*missing English introduction/,
      );
      assert.match(
        error.message,
        /@lynx-js\/lynx-ui-empty-zh.*missing Chinese introduction/,
      );
      return true;
    },
  );
});

test('rejects section headings as package introductions', (t) => {
  const packagesDir = makeTempDir(t);
  writePackage(packagesDir, 'lynx-ui-heading-only', {
    readme: '# Heading only\n\n## Installation\n\nInstall steps.\n',
    readmeZh: '# Heading only\n\n## Installation\n\nInstall steps.\n',
  });

  assert.throws(
    () => collectIntros(packagesDir),
    (error) => {
      assert.match(error.message, /missing English introduction/);
      assert.match(error.message, /missing Chinese introduction/);
      return true;
    },
  );
});
