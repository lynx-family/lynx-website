import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  renameSync,
  symlinkSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  allowlistPath,
  annotation,
  checkBudget,
  formatReport,
  limits,
  validateAllowlist,
} from './check-budget.mjs';

const script = fileURLToPath(new URL('./check-budget.mjs', import.meta.url));
function fixture(t) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'media-budget-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: os.devNull,
  };
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const write = (file, data) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), data);
  };
  const commit = () => {
    git('add', '-A');
    git(
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--allow-empty',
      '-qm',
      'fixture',
    );
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  write(allowlistPath, '[]');
  commit();
  const exception = (file) => ({
    path: file,
    blobOid: git('hash-object', '--', file),
    reason: 'Required versioned fixture',
    issue: 'https://github.com/lynx-family/lynx-website/issues/1524',
  });
  return { cwd, git, write, commit, exception };
}

for (const [name, bytes, warning, failed] of [
  ['small image', 42, false, false],
  ['exact warning boundary', limits.warning, false, false],
  ['above warning boundary', limits.warning + 1, true, false],
  ['exact file and total boundary', limits.file, true, false],
  ['above file boundary', limits.file + 1, false, true],
]) {
  test(name, (t) => {
    const f = fixture(t);
    const base = f.git('rev-parse', 'HEAD');
    f.write('screens/with spaces.PNG', Buffer.alloc(bytes, 1));
    const result = checkBudget(f.cwd, base, f.commit());
    assert.equal(result.total, bytes);
    assert.equal(result.failed, failed);
    const report = formatReport(result);
    assert.equal(report.includes('::warning'), warning);
    assert.equal(report.includes('::error'), failed);
    assert.match(report, /screens\/with spaces.PNG/);
    assert.match(
      report,
      failed ? /\[media-budget\] failed/ : /\[media-budget\] success/,
    );
  });
}

test('ignores non-media changes and legacy deletion', (t) => {
  const f = fixture(t);
  f.write('old.gif', Buffer.alloc(limits.file + 1));
  const base = f.commit();
  rmSync(path.join(f.cwd, 'old.gif'));
  f.write('source.js', Buffer.alloc(limits.file + 1));
  const result = checkBudget(f.cwd, base, f.commit());
  assert.equal(result.total, 0);
  assert.equal(result.failed, false);
  assert.match(formatReport(result), /No new media blobs/);
});

test('renames and copies of base blobs do not count, even from non-media paths', (t) => {
  const f = fixture(t);
  const data = Buffer.alloc(limits.file + 1);
  f.write('old.gif', data);
  f.write('source.bin', Buffer.alloc(limits.file + 2, 3));
  const base = f.commit();
  renameSync(path.join(f.cwd, 'old.gif'), path.join(f.cwd, 'renamed.gif'));
  f.write('copy.gif', data);
  f.write('reused.pdf', Buffer.alloc(limits.file + 2, 3));
  const result = checkBudget(f.cwd, base, f.commit());
  assert.equal(result.total, 0);
  assert.equal(result.reusedPaths, 3);
});

test('counts identical new content once and reports every path', (t) => {
  const f = fixture(t);
  const base = f.git('rev-parse', 'HEAD');
  for (const file of ['a.webp', 'nested/b.jpg'])
    f.write(file, Buffer.alloc(150 * 1024));
  const result = checkBudget(f.cwd, base, f.commit());
  assert.equal(result.total, 150 * 1024);
  assert.equal(result.blobs.length, 1);
  assert.equal(result.failed, false);
  assert.deepEqual(result.blobs[0].paths, ['a.webp', 'nested/b.jpg']);
  assert.match(formatReport(result), /nested\/b.jpg/);
});

test('unique sub-limit files exceed the aggregate limit; deletion gives no credit', (t) => {
  const f = fixture(t);
  f.write('old.gif', Buffer.alloc(limits.file * 2, 3));
  const base = f.commit();
  rmSync(path.join(f.cwd, 'old.gif'));
  for (let index = 0; index < 6; index++)
    f.write(`${index}.png`, Buffer.alloc(180 * 1024, index));
  const result = checkBudget(f.cwd, base, f.commit());
  assert.equal(result.total, 1080 * 1024);
  assert.equal(result.failed, true);
  const report = formatReport(result);
  assert.match(report, /exceeding.*change budget/);
  assert.doesNotMatch(report, /per-file limit/);
});

test('replacement counts the full final blob, not the delta or intermediate commits', (t) => {
  const f = fixture(t);
  f.write('demo.gif', Buffer.alloc(10));
  const base = f.commit();
  f.write('demo.gif', Buffer.alloc(limits.file * 3));
  f.commit();
  f.write('demo.gif', Buffer.alloc(limits.file + 1, 2));
  assert.equal(checkBudget(f.cwd, base, f.commit()).total, limits.file + 1);
});

test('symlinks are not media payloads; regular-file replacements are counted', (t) => {
  const f = fixture(t);
  symlinkSync('missing.png', path.join(f.cwd, 'link.png'));
  const base = f.commit();
  rmSync(path.join(f.cwd, 'link.png'));
  f.write('link.png', Buffer.alloc(limits.file + 1));
  symlinkSync('link.png', path.join(f.cwd, 'other.png'));
  const result = checkBudget(f.cwd, base, f.commit());
  assert.equal(result.blobs.length, 1);
  assert.equal(result.failed, true);
});

test('allowlisted paths are reported and excluded from both limits', (t) => {
  const f = fixture(t);
  const base = f.git('rev-parse', 'HEAD');
  f.write('big.pdf', Buffer.alloc(limits.file + 1));
  f.write(allowlistPath, JSON.stringify([f.exception('big.pdf')]));
  const head = f.commit();
  // Uncommitted policy edits must not affect the result.
  f.write(allowlistPath, 'invalid json');
  const result = checkBudget(f.cwd, base, head);
  assert.equal(result.total, 0);
  assert.equal(result.failed, false);
  assert.equal(result.exceptions[0].size, limits.file + 1);
  assert.match(formatReport(result), /Exception: "big.pdf"/);
});

test('one allowlisted duplicate does not exempt an unapproved path', (t) => {
  const f = fixture(t);
  const base = f.git('rev-parse', 'HEAD');
  for (const file of ['a.pdf', 'b.pdf'])
    f.write(file, Buffer.alloc(limits.file + 1));
  f.write(allowlistPath, JSON.stringify([f.exception('a.pdf')]));
  const result = checkBudget(f.cwd, base, f.commit());
  assert.equal(result.total, limits.file + 1);
  assert.equal(result.failed, true);
  assert.deepEqual(result.blobs[0].paths, ['b.pdf']);
});

test('rejects malformed, duplicate, stale and deleted exceptions', (t) => {
  const f = fixture(t);
  f.write('big.pdf', 'fixture');
  const entry = f.exception('big.pdf');
  const tree = new Map([['big.pdf', { mode: '100644', oid: entry.blobOid }]]);
  const invalid = [
    {},
    [null],
    [{ ...entry, reason: ' ' }],
    [{ ...entry, issue: '' }],
    [{ ...entry, issue: 'http://example.com' }],
    [{ ...entry, issue: 'https://user:password@example.com' }],
    [{ ...entry, blobOid: 'abc' }],
    [{ ...entry, path: '../big.pdf' }],
    [{ ...entry, path: '/big.pdf' }],
    [{ ...entry, path: 'big.txt' }],
    [{ ...entry, unexpected: true }],
    [entry, entry],
    [{ ...entry, blobOid: '0'.repeat(40) }],
    [{ ...entry, path: 'gone.pdf' }],
  ];
  for (const value of invalid)
    assert.throws(() => validateAllowlist(value, tree));
  assert.throws(() => validateAllowlist([entry], new Map()), /Stale/);
});

test('missing or malformed committed policy fails closed', (t) => {
  const f = fixture(t);
  const base = f.git('rev-parse', 'HEAD');
  rmSync(path.join(f.cwd, allowlistPath));
  assert.throws(
    () => checkBudget(f.cwd, base, f.commit()),
    /Missing.*allowlist/,
  );
  f.write(allowlistPath, '{broken');
  assert.throws(() => checkBudget(f.cwd, base, f.commit()), SyntaxError);
});

test('annotation escaping prevents filename workflow command injection', (t) => {
  const file = 'odd%:,\n::error title=bad::injected\r.png';
  assert.equal(
    annotation('warning', 'a%\r\nb', file),
    '::warning file=odd%25%3A%2C%0A%3A%3Aerror title=bad%3A%3Ainjected%0D.png::a%25%0D%0Ab',
  );
  const f = fixture(t);
  const base = f.git('rev-parse', 'HEAD');
  f.write(file, Buffer.alloc(limits.warning + 1));
  const result = checkBudget(f.cwd, base, f.commit());
  assert.deepEqual(result.blobs[0].paths, [file]);
  assert.ok(!formatReport(result).includes('\n::error title=bad::injected'));
});

for (const target of ['main', 'release/4.0', 'merge-queue']) {
  test(`first-parent comparison works in a depth-2 ${target} merge checkout`, (t) => {
    const f = fixture(t);
    if (target !== 'main') f.git('switch', '-c', target);
    f.git('switch', '-c', 'topic');
    f.write('new.webp', Buffer.alloc(100));
    f.commit();
    if (target === 'merge-queue') {
      f.write('queued.pdf', Buffer.alloc(200, 2));
      f.commit();
    }
    f.git('switch', target);
    f.write('target-only.png', Buffer.alloc(limits.file + 1, 7));
    f.commit();
    f.git(
      '-c',
      'commit.gpgsign=false',
      'merge',
      '--no-ff',
      'topic',
      '-m',
      'synthetic merge',
    );
    const clone = path.join(f.cwd, 'shallow');
    f.git(
      'clone',
      '--depth=2',
      '--no-local',
      '--branch',
      target,
      `file://${f.cwd}`,
      clone,
    );
    const result = checkBudget(clone, 'HEAD^1', 'HEAD');
    assert.equal(result.total, target === 'merge-queue' ? 300 : 100);
    assert.equal(result.failed, false);
    const cli = spawnSync(process.execPath, [script, 'HEAD^1', 'HEAD'], {
      cwd: clone,
      encoding: 'utf8',
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(cli.stdout, /\[media-budget\] success/);
  });
}

test('CLI distinguishes budget failures from Git/configuration errors', (t) => {
  const f = fixture(t);
  f.write('large.png', Buffer.alloc(limits.file + 1));
  f.commit();
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: f.cwd,
      encoding: 'utf8',
    });
  assert.equal(run('HEAD^', 'HEAD').status, 1);
  assert.equal(run('missing', 'HEAD').status, 2);
  assert.equal(run('--help', 'HEAD').status, 2);
  assert.equal(run().status, 2);
});
