#!/usr/bin/env node
// Validates that hand-pinned Lynx version strings across docs match
// docs/public/version.json. Run from repo root or pass --root <path>.
//
// Checks:
//   A. Internal consistency: every `lynx-family/lynx/releases/(download|tag)/X.Y.Z/`
//      occurrence in docs/** must equal LYNX_VERSION (with an exception list
//      for historical blog posts).
//   B. en/zh parity (Lynx release URLs and whitelisted npm/unpkg packages):
//      docs/en/<path> and docs/zh/<path> must reference the same versions.
//   C. `releases/latest/download/` warning: this redirect resolves to whatever
//      GitHub marks latest, which drifts away from the current branch's line.
//   D. (--remote) LYNX_VERSION freshness against upstream lynx-family/lynx.
//
// Exits non-zero on hard failures; warnings print but don't fail.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) args.set(a.slice(2), process.argv[++i] ?? true);
}
const ROOT = path.resolve(args.get('root') ?? '.');
const DOCS = path.join(ROOT, 'docs');
const VERSION_JSON = path.join(DOCS, 'public', 'version.json');
const CHECK_REMOTE = args.get('remote') === true || args.get('remote') === 'true';

const versionJson = JSON.parse(readFileSync(VERSION_JSON, 'utf8'));
const LYNX = versionJson.LYNX_VERSION;
const PRIMJS = versionJson.PRIMJS_VERSION;

if (!LYNX) {
  console.warn(
    `[warn] LYNX_VERSION missing in ${VERSION_JSON}; only running parity + latest checks.`,
  );
}

// Files where a historical version pin is legitimate (release blog posts).
const HISTORICAL_PIN_ALLOWLIST = [
  /\/docs\/(en|zh)\/blog\/lynx-\d+-\d+\.mdx$/,
];

const PINNED_RE =
  /lynx-family\/lynx\/releases\/(download|tag)\/(\d+\.\d+\.\d+(?:-[\w.]+)?)/g;
const LATEST_RE = /lynx-family\/lynx\/releases\/latest\/download\//g;
// Matches unpkg / npm package pins like @lynx-js/web-explorer@0.0.15 or @latest
const PKG_PIN_RE =
  /(@?[a-z0-9][\w./-]*?)@(\d+\.\d+\.\d+(?:-[\w.]+)?|latest)\b/gi;
// Only audit these packages for en/zh parity; others may legitimately differ.
const PARITY_PACKAGES = new Set([
  '@lynx-js/web-explorer',
  'upgrade-rspeedy',
  'upgrade-rspeedy-canary',
  '@lynx-js/rspeedy',
  'create-rspeedy',
]);

const errors = [];
const warnings = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(mdx?|tsx?|jsx?)$/.test(name)) yield p;
  }
}

const pinsByFile = new Map();
const pkgPinsByFile = new Map();

for (const file of walk(DOCS)) {
  const rel = path.relative(ROOT, file);
  const text = readFileSync(file, 'utf8');
  const allowHistorical = HISTORICAL_PIN_ALLOWLIST.some((r) =>
    r.test('/' + rel),
  );

  // A. Pinned Lynx versions
  const pins = new Set();
  for (const m of text.matchAll(PINNED_RE)) {
    const ver = m[2];
    pins.add(ver);
    if (LYNX && ver !== LYNX && !allowHistorical) {
      errors.push(
        `${rel}: pinned Lynx version ${ver} does not match LYNX_VERSION (${LYNX})`,
      );
    }
  }
  pinsByFile.set(rel, pins);

  // B'. Package version pins (for parity checks)
  const pkgPins = new Map();
  for (const m of text.matchAll(PKG_PIN_RE)) {
    const pkg = m[1];
    const ver = m[2];
    if (!PARITY_PACKAGES.has(pkg)) continue;
    if (!pkgPins.has(pkg)) pkgPins.set(pkg, new Set());
    pkgPins.get(pkg).add(ver);
  }
  pkgPinsByFile.set(rel, pkgPins);

  // C. /releases/latest/download/ drift
  if (LATEST_RE.test(text) && !allowHistorical) {
    warnings.push(
      `${rel}: uses releases/latest/download/ which resolves to whatever GitHub marks latest. Pin to {versionJson.LYNX_VERSION} or an explicit version.`,
    );
  }
}

// B. en/zh parity (Lynx releases URLs)
for (const [rel, pins] of pinsByFile) {
  if (!rel.startsWith('docs/en/')) continue;
  const zh = 'docs/zh/' + rel.slice('docs/en/'.length);
  const zhPins = pinsByFile.get(zh);
  if (!zhPins) continue;
  const enOnly = [...pins].filter((v) => !zhPins.has(v));
  const zhOnly = [...zhPins].filter((v) => !pins.has(v));
  if (enOnly.length || zhOnly.length) {
    errors.push(
      `en/zh Lynx-release mismatch between ${rel} and ${zh}: en-only=[${enOnly.join(',')}] zh-only=[${zhOnly.join(',')}]`,
    );
  }
}

// B'. en/zh parity (npm/unpkg pkg pins for whitelisted PARITY_PACKAGES)
for (const [rel, pkgPins] of pkgPinsByFile) {
  if (!rel.startsWith('docs/en/')) continue;
  const zh = 'docs/zh/' + rel.slice('docs/en/'.length);
  const zhPkgPins = pkgPinsByFile.get(zh);
  if (!zhPkgPins) continue;
  for (const [pkg, enVers] of pkgPins) {
    const zhVers = zhPkgPins.get(pkg) ?? new Set();
    const enOnly = [...enVers].filter((v) => !zhVers.has(v));
    const zhOnly = [...zhVers].filter((v) => !enVers.has(v));
    if (enOnly.length || zhOnly.length) {
      errors.push(
        `en/zh ${pkg} version mismatch between ${rel} and ${zh}: en=[${[...enVers].join(',')}] zh=[${[...zhVers].join(',')}]`,
      );
    }
  }
  for (const pkg of zhPkgPins.keys()) {
    if (!pkgPins.has(pkg)) {
      errors.push(
        `en/zh ${pkg} version mismatch between ${rel} and ${zh}: en=[] zh=[${[...zhPkgPins.get(pkg)].join(',')}]`,
      );
    }
  }
}

// D. Optional remote freshness: LYNX_VERSION must be the latest stable patch
//    in its major.minor line per GitHub releases.
if (CHECK_REMOTE && LYNX) {
  const want = LYNX.split('.').slice(0, 2).join('.');
  try {
    const res = await fetch(
      'https://api.github.com/repos/lynx-family/lynx/releases?per_page=50',
      { headers: { 'User-Agent': 'lynx-website-guardrail' } },
    );
    const data = await res.json();
    const stableInLine = data
      .filter((r) => !r.draft && !r.prerelease)
      .map((r) => r.tag_name)
      .filter((t) => t.startsWith(want + '.'))
      .sort((a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
        return 0;
      });
    const latestInLine = stableInLine[0];
    if (latestInLine && latestInLine !== LYNX) {
      warnings.push(
        `LYNX_VERSION=${LYNX} is stale in the ${want}.x line; latest stable is ${latestInLine}.`,
      );
    } else if (!latestInLine) {
      warnings.push(
        `Could not find a stable release in the ${want}.x line on upstream.`,
      );
    }
  } catch (e) {
    warnings.push(`Remote freshness check failed: ${e.message}`);
  }
}

if (errors.length) {
  console.error('=== version consistency: ERRORS ===');
  for (const e of errors) console.error('  ' + e);
}
if (warnings.length) {
  console.warn('=== version consistency: warnings ===');
  for (const w of warnings) console.warn('  ' + w);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(
  `OK: 0 errors, ${warnings.length} warning(s). LYNX_VERSION=${LYNX} PRIMJS_VERSION=${PRIMJS}`,
);
