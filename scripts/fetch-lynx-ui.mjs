#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET_DIR = '.lynx-ui-source';
const REPO = 'https://github.com/lynx-family/lynx-ui.git';
const SHORT_SHA_LEN = 8;

const readShaFromFile = () => {
  try {
    return readFileSync(
      resolve(process.cwd(), 'lynx-ui.version'),
      'utf8',
    ).trim();
  } catch {
    return '';
  }
};

const sha = (
  process.argv[2] ||
  process.env.LYNX_UI_SHA ||
  readShaFromFile()
).trim();

if (!sha) {
  console.error('No lynx-ui SHA provided.');
  process.exit(1);
}

const targetPath = resolve(process.cwd(), TARGET_DIR);

const run = (command, options = {}) =>
  execSync(command, { stdio: 'inherit', ...options });

const readHead = () => {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: targetPath,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
  } catch {
    return null;
  }
};

if (existsSync(targetPath)) {
  const current = readHead();
  if (current === sha) {
    console.log(
      `lynx-ui already at ${sha.slice(0, SHORT_SHA_LEN)}, skipping fetch.`,
    );
    process.exit(0);
  }

  if (current) {
    try {
      run('git remote get-url origin', { cwd: targetPath });
    } catch {
      run(`git remote add origin ${REPO}`, { cwd: targetPath });
    }

    console.log(`Updating lynx-ui to ${sha.slice(0, SHORT_SHA_LEN)}...`);
    run(`git fetch --depth 1 origin ${sha}`, { cwd: targetPath });
    run('git checkout --force FETCH_HEAD', { cwd: targetPath });
    console.log(`lynx-ui source ready at ${TARGET_DIR}/`);
    process.exit(0);
  }

  rmSync(targetPath, { recursive: true, force: true });
}

console.log(`Fetching lynx-ui at ${sha.slice(0, SHORT_SHA_LEN)}...`);

run(
  `git clone --depth 1 --filter=blob:none --no-checkout ${REPO} ${TARGET_DIR}`,
);

run(`git fetch --depth 1 origin ${sha}`, { cwd: targetPath });

run('git checkout FETCH_HEAD', { cwd: targetPath });

console.log(`lynx-ui source ready at ${TARGET_DIR}/`);
