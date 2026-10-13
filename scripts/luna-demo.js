/**
 * Materialize installed Luna demo packages under the documentation site's
 * public example directory by copying (default) or symlinking them.
 *
 * LUNA_SOURCE_DIR may point to one installed package directory or a flat
 * collection of package directories from the same scope.
 *
 * Usage:
 *   LINK_PATH=docs/public/lynx-examples \
 *   LUNA_SOURCE_DIR=path/to/package-or-flat-collection \
 *   LUNA_MODE=copy \
 *   node scripts/luna-demo.js
 *
 * Environment variables:
 * - LUNA_SOURCE_DIR: Source directory. Can be:
 *   1) A single package directory (contains package.json), or
 *   2) A flat collection containing package directories from one scope.
 *   Default: node_modules/@dugyu/luna-demo-bundles
 * - LINK_PATH: Target root directory.
 *   Default: docs/public/lynx-examples
 * - LUNA_MODE: "copy" (default) or "symlink".
 * - LUNA_COPY_ALL: "true" to copy/symlink all discovered packages (not recommended).
 *   Default: "false" (only packages with dist/*.web.bundle will be processed).
 *
 * Notes:
 * - The script does NOT remove LINK_PATH.
 * - For each processed package, it replaces LINK_PATH/<packageName> to avoid stale files.
 */
const fs = require('fs');
const path = require('path');
const {
  assertExampleOutputBatchOwnership,
} = require('./example-output-id-collision');

const currentDir = process.cwd();
const sourceDir = path.join(
  currentDir,
  process.env.LUNA_SOURCE_DIR || 'node_modules/@dugyu/luna-demo-bundles',
);
const linkPath = path.join(
  currentDir,
  process.env.LINK_PATH || 'docs/public/lynx-examples',
);
const rawMode = process.env.LUNA_MODE;
const mode = (rawMode || 'copy').toLowerCase();
const supportedModes = new Set(['copy', 'symlink']);
const copyAll = (process.env.LUNA_COPY_ALL || 'false').toLowerCase() === 'true';

function isDirectory(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

/**
 * Derive the flat output ID from the final segment of the package name.
 */
function readPackageName(packageDir) {
  const packageJSONPath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packageJSONPath)) {
    return path.basename(packageDir);
  }
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
  const name = typeof packageJSON.name === 'string' ? packageJSON.name : '';
  return (name.split('/').pop() || path.basename(packageDir)).trim();
}

function ensureCleanDir(targetDir) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
}

function linkOrCopyDirectory(sourcePath, targetPath) {
  ensureCleanDir(targetPath);
  if (mode === 'symlink') {
    fs.symlinkSync(sourcePath, targetPath);
    return;
  }

  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    dereference: true,
    preserveTimestamps: true,
    force: true,
  });
}

function getWebBundleFiles(packageDir) {
  const distDir = path.join(packageDir, 'dist');
  if (!isDirectory(distDir)) {
    return null;
  }
  return fs.readdirSync(distDir).filter((f) => f.endsWith('.web.bundle'));
}

/**
 * Discover either one package or the immediate package children of one flat
 * collection. Nested scope discovery is intentionally unsupported.
 */
function getPackageDirs(rootDir) {
  if (!isDirectory(rootDir)) {
    throw new Error(`sourceDir is not a directory: ${rootDir}`);
  }

  const rootPackageJSON = path.join(rootDir, 'package.json');
  if (fs.existsSync(rootPackageJSON)) {
    return [rootDir];
  }

  const ignored = new Set(['.pnpm', '.bin']);
  return fs
    .readdirSync(rootDir)
    .filter((name) => !ignored.has(name))
    .map((name) => path.join(rootDir, name))
    .filter((dir) => isDirectory(dir))
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')));
}

/**
 * Collect eligible packages, validate the complete batch without mutation,
 * then materialize each package only after every ownership check succeeds.
 */
function main() {
  if (!supportedModes.has(mode)) {
    console.error(
      `[prepare:luna] invalid LUNA_MODE=${String(rawMode)} (supported: copy | symlink)`,
    );
    process.exitCode = 1;
    return;
  }

  if (!isDirectory(sourceDir)) {
    console.error(`LUNA_SOURCE_DIR not found: ${sourceDir}`);
    process.exitCode = 1;
    return;
  }

  const packageDirs = getPackageDirs(sourceDir);
  if (packageDirs.length === 0) {
    console.error(`No packages found under: ${sourceDir}`);
    process.exitCode = 1;
    return;
  }

  const startedAt = Date.now();
  console.log(
    `[prepare:luna] start mode=${mode} source=${sourceDir} target=${linkPath}`,
  );

  // Phase 1: collect immutable records. Filtering here ensures packages that
  // will not be published cannot reserve or collide with an output ID.
  const packageRecords = packageDirs.flatMap((packageDir) => {
    const outputId = readPackageName(packageDir);
    const webBundles = getWebBundleFiles(packageDir);
    if (!copyAll && (!webBundles || webBundles.length === 0)) {
      return [];
    }

    return [
      {
        outputId,
        sourceDir: packageDir,
        targetDir: path.join(linkPath, outputId),
        webBundles,
      },
    ];
  });

  // Phase 2: finish all read-only ownership checks before touching outputs.
  assertExampleOutputBatchOwnership(packageRecords);

  fs.mkdirSync(linkPath, { recursive: true });

  // Phase 3: materialize. No ownership failure is possible beyond this point,
  // so a later collision cannot leave earlier packages partially published.
  let processedCount = 0;
  packageRecords.forEach(
    ({ sourceDir: packageDir, outputId, targetDir, webBundles }) => {
      linkOrCopyDirectory(packageDir, targetDir);
      processedCount += 1;
      console.log(`[prepare:luna] synced ${outputId} -> ${targetDir}`);

      if (!webBundles) {
        console.log(`[prepare:luna] dist directory not found for ${outputId}`);
        return;
      }
      console.log(
        `[prepare:luna] found ${webBundles.length} dist/*.web.bundle for ${outputId}`,
      );
    },
  );

  const durationMs = Date.now() - startedAt;
  console.log(
    `[prepare:luna] success processed=${processedCount} discovered=${packageDirs.length} durationMs=${durationMs}`,
  );
}

main();
