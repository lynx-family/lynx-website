#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const extensionDir = path.resolve(path.dirname(__filename), '..');
const showcaseDir = path.resolve(extensionDir, '..');
const repoRoot = path.resolve(extensionDir, '../../..');

const supportedPlatforms = new Set(['darwin', 'win32']);
const forceBuild = process.env.LYNXTRON_FORCE_NATIVE_TEXTURE_BUILD === '1';

if (!supportedPlatforms.has(process.platform) && !forceBuild) {
  console.log(
    `[lynxtron-native-texture-canvas] Native build skipped on ${process.platform}; supported platforms are macOS and Windows.`,
  );
  process.exit(0);
}

const executableName =
  process.platform === 'win32' ? 'cmake-js.cmd' : 'cmake-js';
const candidates = [
  path.join(extensionDir, 'node_modules', '.bin', executableName),
  path.join(showcaseDir, 'node_modules', '.bin', executableName),
  path.join(repoRoot, 'node_modules', '.bin', executableName),
  path.join(
    repoRoot,
    'lynxtron-go',
    'scintilla-extension',
    'node_modules',
    '.bin',
    executableName,
  ),
];

const command =
  candidates.find((candidate) => fs.existsSync(candidate)) ?? executableName;
// On Windows, spawning a `.cmd` shim requires running through a shell.
// Otherwise Node may throw `spawn EINVAL`.
const child = spawn(command, ['compile'], {
  cwd: extensionDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: false,
});

child.on('error', (error) => {
  console.error(
    '[lynxtron-native-texture-canvas] Failed to start cmake-js:',
    error,
  );
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (code === 0) {
    process.exit(0);
    return;
  }
  if (signal) {
    console.error(
      `[lynxtron-native-texture-canvas] cmake-js exited with signal ${signal}`,
    );
  }
  process.exit(code ?? 1);
});
