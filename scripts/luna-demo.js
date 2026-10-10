/**
 * Prepare Luna demo packages for the documentation site by copying (default) or symlinking
 * demo packages from a source directory into a public directory.
 *
 * Typical use case:
 * - You have one or more installed demo packages under node_modules, e.g.
 *   packages/luna-packages/node_modules/<scope>/<pkg>
 * - You want them materialized under docs/public/lynx-examples/<pkgName>
 *
 * Usage:
 *   LINK_PATH=docs/public/lynx-examples \
 *   LUNA_SOURCE_DIR=packages/luna-packages/node_modules \
 *   LUNA_MODE=copy \
 *   node scripts/luna-demo.js
 *
 * Environment variables:
 * - LUNA_SOURCE_DIR: Source directory. Can be:
 *   1) A node_modules directory (will scan one level and scope directories), or
 *   2) A scope directory containing multiple packages (each with package.json), or
 *   3) A single package directory (contains package.json)
 *   Default: packages/luna-packages/node_modules
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
  assertExampleOutputIdOwnership,
  assertExampleOutputOwnership,
} = require('./example-output-ownership');

const currentDir = process.cwd();
const sourceDir = path.join(
  currentDir,
  process.env.LUNA_SOURCE_DIR || 'packages/luna-packages/node_modules',
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
 *
 * Scanning multiple scopes can therefore produce the same ID for different
 * owners, such as @alpha/demo and @beta/demo.
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

  fs.mkdirSync(targetPath, { recursive: true });
  // Publish package.json first so a partial copy retains its package owner.
  const entries = fs.readdirSync(sourcePath).sort((left, right) => {
    if (left === 'package.json') return -1;
    if (right === 'package.json') return 1;
    return 0;
  });
  entries.forEach((entry) => {
    fs.cpSync(path.join(sourcePath, entry), path.join(targetPath, entry), {
      recursive: true,
      dereference: true,
      preserveTimestamps: true,
      force: true,
    });
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
 * Discover a single package, packages in one scope, or packages across a
 * node_modules root. The result may contain duplicate basenames across scopes.
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
  const firstLevelDirs = fs
    .readdirSync(rootDir)
    .filter((name) => !ignored.has(name))
    .map((name) => path.join(rootDir, name))
    .filter((dir) => isDirectory(dir));

  const packageDirs = [];

  firstLevelDirs.forEach((dir) => {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      packageDirs.push(dir);
      return;
    }

    if (path.basename(dir).startsWith('@')) {
      fs.readdirSync(dir)
        .map((name) => path.join(dir, name))
        .filter((subDir) => isDirectory(subDir))
        .filter((subDir) => fs.existsSync(path.join(subDir, 'package.json')))
        .forEach((subDir) => packageDirs.push(subDir));
    }
  });

  return packageDirs;
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

  // Build immutable copy records first. Filtering here ensures packages that
  // will not be published cannot reserve or collide with an output ID.
  const packageRecords = packageDirs.flatMap((packageDir) => {
    const packageName = readPackageName(packageDir);
    const webBundles = getWebBundleFiles(packageDir);
    if (!copyAll && (!webBundles || webBundles.length === 0)) {
      return [];
    }

    return [
      {
        packageDir,
        packageName,
        targetDir: path.join(linkPath, packageName),
        webBundles,
      },
    ];
  });

  // Disk checks prevent overwriting outputs from earlier generators. The Map
  // separately catches two incoming scopes that flatten to the same basename
  // while the disk target is still absent.
  const incomingOwners = new Map();
  packageRecords.forEach(({ packageDir, targetDir, packageName }) => {
    const sourceOwner = assertExampleOutputOwnership(
      packageDir,
      targetDir,
      packageName,
    );
    assertExampleOutputIdOwnership(
      packageName,
      incomingOwners.get(packageName),
      sourceOwner,
    );
    incomingOwners.set(packageName, sourceOwner);
  });

  fs.mkdirSync(linkPath, { recursive: true });

  // No ownership failure is possible beyond this point, so replacing targets
  // cannot leave earlier packages copied before a later collision is found.
  let processedCount = 0;
  packageRecords.forEach(
    ({ packageDir, packageName, targetDir, webBundles }) => {
      linkOrCopyDirectory(packageDir, targetDir);
      processedCount += 1;
      console.log(`[prepare:luna] synced ${packageName} -> ${targetDir}`);

      if (!webBundles) {
        console.log(
          `[prepare:luna] dist directory not found for ${packageName}`,
        );
        return;
      }
      console.log(
        `[prepare:luna] found ${webBundles.length} dist/*.web.bundle for ${packageName}`,
      );
    },
  );

  const durationMs = Date.now() - startedAt;
  console.log(
    `[prepare:luna] success processed=${processedCount} discovered=${packageDirs.length} durationMs=${durationMs}`,
  );
}

main();
