/**
 * Processes @lynx-example/* packages from node_modules into
 * public/lynx-examples/ with generated example-metadata.json files.
 *
 * Adapted from the root scripts/lynx-example.js so the standalone
 * example app can work independently of the docs build.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const examplesDir = path.join(rootDir, 'node_modules/@lynx-example');
const outputDir = path.join(rootDir, 'public/lynx-examples');
const lynxEntryFileName = '.lynx.bundle';
const webEntryFileName = '.web.bundle';
const exampleGitBaseUrl =
  'https://github.com/lynx-family/lynx-examples/tree/main';

const ignoreDirs = ['node_modules', '.git', '.turbo'];
const ignoreFiles = ['.DS_Store', 'LICENSE'];

function getAllFiles(dirPath, arrayOfFiles = []) {
  for (const file of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (!ignoreFiles.includes(file)) {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (ignoreDirs.includes(entry) || ignoreFiles.includes(entry)) continue;
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      execSync(`cp -Lrfp "${srcPath}" "${destPath}"`);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getTemplateFiles(files) {
  const entries = [];
  for (const file of files) {
    if (file.endsWith(lynxEntryFileName)) {
      const parts = file.split('/');
      const name = parts.at(-1).replace(lynxEntryFileName, '') || parts.at(-2);
      const entry = { name, file };
      const webFile = file.replace(lynxEntryFileName, webEntryFileName);
      if (files.includes(webFile)) entry.webFile = webFile;
      entries.push(entry);
    }
  }
  return entries;
}

function sortFiles(files) {
  const dirs = files.filter((f) => f.includes('/')).sort();
  const flat = files.filter((f) => !f.includes('/')).sort();
  return [...dirs, ...flat];
}

// --- Main ---

if (!fs.existsSync(examplesDir)) {
  console.log('No @lynx-example packages found, skipping.');
  process.exit(0);
}

// Clean and recreate output
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

const examples = fs.readdirSync(examplesDir).filter((name) => {
  const dir = path.join(examplesDir, name);
  return (
    fs.statSync(dir).isDirectory() &&
    fs.existsSync(path.join(dir, 'package.json'))
  );
});

for (const example of examples) {
  const srcDir = path.join(examplesDir, example);
  const destDir = path.join(outputDir, example);

  copyDir(srcDir, destDir);

  const allFiles = getAllFiles(srcDir, []);
  const files = allFiles.map((f) => path.relative(srcDir, f));
  const previewImageRe = /^preview-image\.(png|jpg|jpeg|webp|gif)$/;
  const filtered = files.filter(
    (f) => !previewImageRe.test(f) && f !== 'example-metadata.json',
  );
  const sorted = sortFiles(filtered);
  const previewImage = files.find((f) => previewImageRe.test(f));
  const templateFiles = getTemplateFiles(filtered);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(srcDir, 'package.json'), 'utf8'),
  );

  fs.writeFileSync(
    path.join(destDir, 'example-metadata.json'),
    JSON.stringify(
      {
        name: pkg.repository?.directory || example,
        files: sorted,
        previewImage,
        templateFiles,
        exampleGitBaseUrl,
      },
      null,
      2,
    ),
  );
}

console.log(`Prepared ${examples.length} examples in public/lynx-examples/`);
