#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
);
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const tar = process.platform === 'win32' ? 'tar.exe' : 'tar';

const packDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'lynx-compat-data-pack-'),
);
let consumerDir;

function fail(message) {
  throw new Error(`[pack-check] ${message}`);
}

function run(command, args, options) {
  try {
    return execFileSync(command, args, {
      ...options,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    if (error.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error.stderr) {
      process.stderr.write(error.stderr);
    }
    throw error;
  }
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
}

try {
  run(pnpm, ['pack', '--pack-destination', packDir], {
    cwd: packageRoot,
  });

  const tarballs = fs
    .readdirSync(packDir)
    .filter((entry) => entry.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    fail(`expected one tarball in ${packDir}, found ${tarballs.length}`);
  }

  const tarballPath = path.join(packDir, tarballs[0]);
  const tarballEntries = new Set(
    run(tar, ['-tzf', tarballPath]).trim().split('\n').filter(Boolean),
  );

  const generatedPropertiesDir = path.join(packageRoot, 'css', 'properties');
  const manualPropertiesDir = path.join(
    packageRoot,
    'css',
    'properties-manual',
  );
  const generatedFiles = listJsonFiles(generatedPropertiesDir);
  const manualFiles = listJsonFiles(manualPropertiesDir);

  if (generatedFiles.length === 0) {
    fail('css/properties/*.json was not generated before packing');
  }

  const missingGeneratedEntries = generatedFiles.filter(
    (file) => !tarballEntries.has(`package/css/properties/${file}`),
  );
  if (missingGeneratedEntries.length > 0) {
    fail(
      `tarball is missing generated CSS property files: ${missingGeneratedEntries.join(
        ', ',
      )}`,
    );
  }

  const missingManualOutputs = manualFiles.filter(
    (file) => !generatedFiles.includes(file),
  );
  if (missingManualOutputs.length > 0) {
    fail(
      `generated CSS output is missing manual property files: ${missingManualOutputs.join(
        ', ',
      )}`,
    );
  }

  const requiredEntries = [
    'package/css/properties/align-content.json',
    'package/css/properties/background-color.json',
    'package/css/properties/custom-property.json',
    'package/css/properties-manual/custom-property.json',
  ];
  const missingRequiredEntries = requiredEntries.filter(
    (entry) => !tarballEntries.has(entry),
  );
  if (missingRequiredEntries.length > 0) {
    fail(
      `tarball is missing required entries: ${missingRequiredEntries.join(', ')}`,
    );
  }

  consumerDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'lynx-compat-data-consumer-'),
  );
  fs.writeFileSync(
    path.join(consumerDir, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2),
  );
  run(pnpm, ['add', '--ignore-scripts', tarballPath], {
    cwd: consumerDir,
  });

  const installedJsonPath = path.join(
    consumerDir,
    'node_modules',
    ...packageJson.name.split('/'),
    'css',
    'properties',
    'custom-property.json',
  );
  JSON.parse(fs.readFileSync(installedJsonPath, 'utf8'));

  console.log(
    `[pack-check] ${packageJson.name} tarball contains ${generatedFiles.length} CSS property files and installs cleanly.`,
  );
} finally {
  fs.rmSync(packDir, { recursive: true, force: true });
  if (consumerDir) {
    fs.rmSync(consumerDir, { recursive: true, force: true });
  }
}
