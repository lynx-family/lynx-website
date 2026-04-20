const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const LYNX_UI_DIR = path.resolve(
  __dirname,
  '../node_modules/@lynx-js/lynx-ui/packages',
);
const LYNX_UI_REPO_DIR = path.resolve(LYNX_UI_DIR, '..');
const SHARED_DOCS_DIR = path.resolve(__dirname, '../sharedDocs/packageDocs');

console.log('🔄 Syncing docs from @lynx-js/lynx-ui to sharedDocs...');

if (!fs.existsSync(LYNX_UI_DIR)) {
  console.warn(`⚠️ Warning: ${LYNX_UI_DIR} not found. Skipping docs sync.`);
  process.exit(0);
}

if (fs.existsSync(SHARED_DOCS_DIR)) {
  // Clean existing sharedDocs directory
  fs.rmSync(SHARED_DOCS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SHARED_DOCS_DIR, { recursive: true });

const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

let copiedCount = 0;
const packages = fs.readdirSync(LYNX_UI_DIR);

packages.forEach((pkgName) => {
  const pkgDocsDir = path.join(LYNX_UI_DIR, pkgName, 'docs');
  if (fs.existsSync(pkgDocsDir) && fs.statSync(pkgDocsDir).isDirectory()) {
    const targetDir = path.join(SHARED_DOCS_DIR, pkgName);

    // Clean existing target directory if it exists
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    copyRecursiveSync(pkgDocsDir, targetDir);
    copiedCount++;
  }
});

console.log(
  `✅ Successfully synced docs for ${copiedCount} packages to sharedDocs/packageDocs.`,
);
