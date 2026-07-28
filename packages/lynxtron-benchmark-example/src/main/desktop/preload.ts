// Record startup time as early as possible
const preloadStartTime = Date.now();

import { contextBridge } from '@lynx-js/lynxtron/context-bridge';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMemoryUsageSnapshot } from './memory-metrics';

// --- Debug log helper ---
const BENCHMARK_LOG = '/tmp/benchmark_preload.log';
function dbg(msg: string) {
  try {
    fs.appendFileSync(BENCHMARK_LOG, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (_) {}
  console.log('[Benchmark]', msg);
}

// --- App Size helpers ---

function getFileSizeBytes(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function sumDirFileSizes(dir: string, extensions?: string[]): number {
  let total = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += sumDirFileSizes(fullPath, extensions);
      } else if (entry.isFile()) {
        if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) {
          total += getFileSizeBytes(fullPath);
        }
      }
    }
  } catch {
    // Ignore unreadable directories
  }
  return total;
}

// Use __non_webpack_require__ to bypass rspack compile-time require.resolve().
// rspack transforms require.resolve() into module IDs at build time, but we need
// actual file path resolution at runtime.
const nativeRequire =
  typeof __non_webpack_require__ !== 'undefined'
    ? (__non_webpack_require__ as NodeRequire)
    : require;

function findPackageRoot(resolvedPath: string): string {
  let pkgDir = path.dirname(resolvedPath);
  while (pkgDir !== path.dirname(pkgDir)) {
    if (fs.existsSync(path.join(pkgDir, 'package.json'))) break;
    pkgDir = path.dirname(pkgDir);
  }
  return pkgDir;
}

function getFrameworkSizeFromVersionsDir(versionsDir: string): number {
  if (!fs.existsSync(versionsDir)) {
    return 0;
  }

  try {
    const versions = fs
      .readdirSync(versionsDir)
      .filter((v) => v !== 'Current' && v !== '.DS_Store');
    let sizeInBytes = 0;
    for (const version of versions) {
      const binaryPath = path.join(versionsDir, version, 'Lynxtron Framework');
      sizeInBytes += getFileSizeBytes(binaryPath);
    }
    return sizeInBytes;
  } catch {
    return 0;
  }
}

function getRuntimeAppCandidates(pkgDir: string): string[] {
  return Array.from(
    new Set([
      path.join(pkgDir, 'dist', 'lynxtron.app'),
      path.join(pkgDir, 'dist', 'darwin', os.arch(), 'lynxtron.app'),
      path.join(pkgDir, 'dist', 'darwin', 'arm64', 'lynxtron.app'),
      path.join(pkgDir, 'dist', 'darwin', 'x64', 'lynxtron.app'),
    ]),
  );
}

function getRuntimeSize(): number {
  try {
    const resolvedPath = nativeRequire.resolve('@lynx-js/lynxtron');
    const pkgDir = findPackageRoot(resolvedPath);
    const appCandidates = getRuntimeAppCandidates(pkgDir);

    for (const appDir of appCandidates) {
      const versionsDir = path.join(
        appDir,
        'Contents',
        'Frameworks',
        'Lynxtron Framework.framework',
        'Versions',
      );
      const sizeInBytes = getFrameworkSizeFromVersionsDir(versionsDir);
      if (sizeInBytes > 0) {
        dbg(
          `runtime path: ${resolvedPath} appPath: ${appDir} size: ${sizeInBytes}`,
        );
        return sizeInBytes;
      }
    }

    dbg(
      `runtime path: ${resolvedPath} | no framework binary found in ${appCandidates.join(', ')}`,
    );
    return 0;
  } catch (err) {
    dbg(`getRuntimeSize error: ${err}`);
    return 0;
  }
}

function getBusinessCodeSize(): number {
  // Business code: .js + .lynx.bundle + .json files in dist/desktop/
  const distDesktop = path.join(__dirname);
  return sumDirFileSizes(distDesktop, ['.js', '.bundle', '.json']);
}

function getExtensionsSize(): number {
  // Native extensions in dist/desktop/node_modules/
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    return 0;
  }
  return sumDirFileSizes(nodeModulesPath);
}

// --- Expose API ---

contextBridge.exposeInLynxBTS({
  benchmark: {
    getAppSize() {
      const runtime = getRuntimeSize();
      const business = getBusinessCodeSize();
      const extensions = getExtensionsSize();
      return {
        runtime,
        business,
        extensions,
        total: runtime + business + extensions,
      };
    },

    getStartupTime() {
      return Date.now() - preloadStartTime;
    },

    getMemoryUsage() {
      return getMemoryUsageSnapshot();
    },

    getPlatformInfo() {
      return {
        platform: os.platform(),
        arch: os.arch(),
        version: '0.0.3',
      };
    },
  },
});
