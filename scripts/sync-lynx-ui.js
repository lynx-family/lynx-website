const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_URL = 'https://github.com/lynx-family/lynx-ui.git';
const BRANCH = 'feat/website';
const CACHE_DIR = path.resolve(__dirname, '..', '.lynx-ui-cache');
const DEPS_DIR = path.resolve(__dirname, '..', 'deps');
const TARGET_TGZ = path.join(DEPS_DIR, 'lynx-js-lynx-ui-doc-latest.tgz');

console.log(`\n📦 [1/4] Pulling lynx-ui repository (Branch: ${BRANCH})...`);
if (fs.existsSync(CACHE_DIR)) {
  console.log(`Cleaning up old cache directory: ${CACHE_DIR}`);
  fs.rmSync(CACHE_DIR, { recursive: true, force: true });
}
execSync(
  `git clone --branch ${BRANCH} --single-branch --depth 1 ${REPO_URL} "${CACHE_DIR}"`,
  { stdio: 'inherit' },
);

// Check if it's under lynx-ui-open-source directory
const workDir = CACHE_DIR;
// if (fs.existsSync(path.join(CACHE_DIR, 'lynx-ui-open-source'))) {
//   workDir = path.join(CACHE_DIR, 'lynx-ui-open-source');
// }

console.log(`\n⚙️  [2/4] Installing lynx-ui dependencies...`);
fs.writeFileSync(
  path.join(workDir, '.npmrc'),
  'strict-peer-dependencies=false\nengine-strict=false\n',
  { flag: 'a' },
);
// Remove pnpm version lock restriction
const pnpmrcPath = path.join(workDir, 'package.json');
if (fs.existsSync(pnpmrcPath)) {
  let pkg = fs.readFileSync(pnpmrcPath, 'utf-8');
  pkg = pkg.replace(/"pnpm":\s*"[^"]+"/, '"pnpm": ">=9.0.0"');
  fs.writeFileSync(pnpmrcPath, pkg);
}
execSync(`pnpm install --config.engine-strict=false`, {
  cwd: workDir,
  stdio: 'inherit',
});

console.log(`\n🔨 [3/4] Running build.cjs to build @lynx-js/lynx-ui-doc...`);
const buildScript = path.join(
  workDir,
  'tools',
  'lynx-ui-doc-pack',
  'build.cjs',
);
execSync(`node "${buildScript}"`, { cwd: workDir, stdio: 'inherit' });

console.log(`\n📦 [4/4] Packing and extracting .tgz artifact...`);
const distDir = path.join(workDir, 'tools', 'lynx-ui-doc-pack', 'dist');
execSync(`npm pack`, { cwd: distDir, stdio: 'inherit' });

if (!fs.existsSync(DEPS_DIR)) {
  fs.mkdirSync(DEPS_DIR, { recursive: true });
}

// Find the generated .tgz file and move it to deps directory
const files = fs.readdirSync(distDir);
const tgzFile = files.find((f) => f.endsWith('.tgz'));
if (tgzFile) {
  const sourcePath = path.join(distDir, tgzFile);
  fs.renameSync(sourcePath, TARGET_TGZ);
  console.log(`\n✅ Successfully output package to: ${TARGET_TGZ}`);
} else {
  console.error(`\n❌ Failed to find the packed .tgz file in ${distDir}`);
  process.exit(1);
}

console.log(
  `\n🎉 Ready! You can now run pnpm install (or npm install) to update dependencies.`,
);
