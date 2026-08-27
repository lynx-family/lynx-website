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

// Git exports GIT_DIR, GIT_INDEX_FILE and friends to the processes it runs --
// hooks especially, and from a worktree they are absolute paths to the *outer*
// repository. Those variables outrank `cwd`, so a `git checkout` aimed at
// .lynx-ui-source with them set silently retargets lynx-website itself: the
// fetch writes the outer FETCH_HEAD and the checkout detaches the outer HEAD
// onto a lynx-ui commit, aborting the commit that triggered it. Strip them so
// every command below is resolved from `cwd`, which is what this script means.
const GIT_ENV_VARS = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_PREFIX',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CEILING_DIRECTORIES',
  'GIT_NAMESPACE',
];

const nestedEnv = () => {
  const env = { ...process.env };
  for (const key of GIT_ENV_VARS) delete env[key];
  return env;
};

const run = (command, options = {}) =>
  execSync(command, { stdio: 'inherit', env: nestedEnv(), ...options });

// git commands run inside a directory that is not itself a repository walk up
// to the enclosing one. Since this script runs from a lynx-website checkout,
// a leftover or partially cloned .lynx-ui-source would otherwise make
// `rev-parse HEAD` report lynx-website's HEAD and `remote get-url origin`
// report lynx-website's URL -- and the fetch below would then ask
// lynx-website for a lynx-ui commit and fail with "not our ref".
const isOwnRepo = () => {
  try {
    const top = execSync('git rev-parse --show-toplevel', {
      cwd: targetPath,
      encoding: 'utf8',
      stdio: 'pipe',
      env: nestedEnv(),
    }).trim();
    return resolve(top) === targetPath;
  } catch {
    return false;
  }
};

const readHead = () => {
  if (!isOwnRepo()) return null;
  try {
    return execSync('git rev-parse HEAD', {
      cwd: targetPath,
      encoding: 'utf8',
      stdio: 'pipe',
      env: nestedEnv(),
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
    // Point origin at lynx-ui whatever it currently says: an origin that
    // exists but refers to another repository would otherwise be used as-is,
    // and the fetch below would look for a lynx-ui commit in the wrong place.
    try {
      run(`git remote set-url origin ${REPO}`, {
        cwd: targetPath,
        stdio: 'pipe',
      });
    } catch {
      run(`git remote add origin ${REPO}`, { cwd: targetPath, stdio: 'pipe' });
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
