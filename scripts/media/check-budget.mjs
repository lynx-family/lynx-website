import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Enforce repository-local media budgets between two committed Git trees.
 *
 * The checker intentionally evaluates final blobs rather than working-tree
 * files or diff byte deltas. This makes a synthetic PR/merge-queue merge
 * compare cleanly against its first parent and counts identical new blobs once.
 */
const KIB = 1024;
const MIB = 1024 * KIB;
const warningThresholdKiB = 100;
const perFileLimitKiB = 200;
const changeBudgetKiB = 1024;

/** Budget policy in bytes; exported so tests exercise the exact boundaries. */
export const limits = {
  warning: warningThresholdKiB * KIB,
  file: perFileLimitKiB * KIB,
  total: changeBudgetKiB * KIB,
};

/** Versioned policy evaluated from the head commit, never from the worktree. */
export const allowlistPath = 'scripts/media/budget-allowlist.json';

/** Repository file extensions treated as media by this policy. */
const mediaExtensions = new Set(
  (
    '.aac .apng .avi .avif .bmp .eot .flac .gif .ico .jpeg .jpg .m4a ' +
    '.m4v .mkv .mov .mp3 .mp4 .ogg .otf .pdf .png .psd .svg .tif .tiff .ttf ' +
    '.wav .webm .webp .woff .woff2 ' +
    // Web-deliverable 3D media and related textures.
    '.glb .gltf .drc .usd .usda .usdc .usdz .fbx .obj .mtl .dae .abc ' +
    '.stl .ply .3mf .ktx .ktx2 .basis .dds .hdr .exr .3dm ' +
    // Authoring/source assets usually belong outside the website repository,
    // but must still count toward the budget when committed.
    '.blend .c4d .ma .mb .max .skp .step .stp .iges .igs .dwg .dxf .ifc'
  ).split(' '),
);

/** Match extensions case-insensitively while Git paths always use `/`. */
const isMedia = (file) =>
  mediaExtensions.has(path.posix.extname(file).toLowerCase());

/**
 * Accept only regular Git blobs: 100644 is a normal file and 100755 executable.
 * Symlinks (120000) and submodules (160000) do not carry repository-local media
 * payload bytes and must not be treated as allowlist targets or budget inputs.
 */
const regularFile = (entry) => entry && /^100(644|755)$/.test(entry.mode);

/** Run Git in a fixed checkout and preserve stderr for configuration failures. */
function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * MIB,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Resolve a ref to a commit, rejecting tags, missing refs, and path revisions. */
function commit(cwd, ref) {
  return git(cwd, [
    'rev-parse',
    '--verify',
    '--end-of-options',
    `${ref}^{commit}`,
  ]).trim();
}

/**
 * Read one recursive Git tree into path -> blob metadata.
 *
 * `ls-tree -z` preserves filenames with spaces, newlines, and other shell-
 * sensitive characters. The map intentionally retains symlink blobs so callers
 * can reject them based on mode instead of assuming extension means a file.
 */
function readTree(cwd, ref) {
  const entries = new Map();
  for (const record of git(cwd, ['ls-tree', '-r', '-l', '-z', ref]).split(
    '\0',
  )) {
    if (!record) continue;
    const separator = record.indexOf('\t');
    const [mode, type, oid, size] = record
      .slice(0, separator)
      .trim()
      .split(/\s+/);
    if (separator < 0) throw new Error('Malformed Git tree record');
    if (type !== 'blob') continue;
    entries.set(record.slice(separator + 1), { mode, oid, size: Number(size) });
  }
  return entries;
}

/**
 * Validate and index reviewed path + blob OID exceptions from the head tree.
 *
 * Exact paths keep one allowlisted duplicate from exempting another path with
 * the same content. Exact blob OIDs make every content replacement require a
 * new review. Every entry must resolve to a current regular media file, which
 * turns deleted or changed exceptions into actionable stale-policy failures.
 */
export function validateAllowlist(value, headTree) {
  if (!Array.isArray(value)) throw new Error('Allowlist must be an array');
  const entries = new Map();
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Object.keys(entry).sort().join(',') !== 'blobOid,issue,path,reason' ||
      typeof entry.path !== 'string' ||
      !entry.path ||
      entry.path.includes('\\') ||
      path.posix.isAbsolute(entry.path) ||
      entry.path
        .split('/')
        .some((part) => !part || part === '.' || part === '..') ||
      !isMedia(entry.path) ||
      typeof entry.blobOid !== 'string' ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(entry.blobOid) ||
      typeof entry.reason !== 'string' ||
      !entry.reason.trim()
    ) {
      throw new Error(
        'Malformed allowlist entry: expected path, blobOid, reason, issue',
      );
    }
    let issue;
    try {
      issue = new URL(entry.issue);
    } catch {
      throw new Error(
        `Invalid issue/decision URL for ${JSON.stringify(entry.path)}`,
      );
    }
    if (
      typeof entry.issue !== 'string' ||
      issue.protocol !== 'https:' ||
      issue.username ||
      issue.password
    ) {
      throw new Error(
        `Invalid issue/decision URL for ${JSON.stringify(entry.path)}`,
      );
    }
    if (entries.has(entry.path)) {
      throw new Error(
        `Duplicate allowlist path: ${JSON.stringify(entry.path)}`,
      );
    }
    const actual = headTree.get(entry.path);
    if (!regularFile(actual) || actual.oid !== entry.blobOid) {
      throw new Error(
        `Stale allowlist entry: ${JSON.stringify(entry.path)}; remove or re-review it`,
      );
    }
    entries.set(entry.path, entry);
  }
  return entries;
}

/**
 * Calculate the budget impact of final media blobs introduced by head vs base.
 *
 * A blob already anywhere in the base tree is a reuse, even when its old path
 * was non-media. New content is grouped by OID so multiple new paths consume
 * bytes only once. An exception removes only its exact path from the group;
 * any unapproved path using that blob remains budgeted.
 */
export function checkBudget(cwd, baseRef, headRef) {
  const base = readTree(cwd, commit(cwd, baseRef));
  const headOid = commit(cwd, headRef);
  const head = readTree(cwd, headOid);
  const policy = head.get(allowlistPath);
  if (!regularFile(policy))
    throw new Error(`Missing regular allowlist file in head: ${allowlistPath}`);
  const exceptions = validateAllowlist(
    JSON.parse(git(cwd, ['cat-file', 'blob', policy.oid])),
    head,
  );
  // Reuse is based on every blob in the target tree, regardless of extension.
  const existing = new Set([...base.values()].map((entry) => entry.oid));
  const blobs = new Map();
  let reusedPaths = 0;
  for (const [file, entry] of head) {
    if (
      !regularFile(entry) ||
      !isMedia(file) ||
      base.get(file)?.oid === entry.oid
    )
      continue;
    if (existing.has(entry.oid)) {
      reusedPaths++;
      continue;
    }
    if (!blobs.has(entry.oid))
      blobs.set(entry.oid, {
        oid: entry.oid,
        size: entry.size,
        paths: [],
        exemptPaths: [],
      });
    const blob = blobs.get(entry.oid);
    (exceptions.has(file) ? blob.exemptPaths : blob.paths).push(file);
  }
  // An exception only exempts its exact path. An unapproved duplicate still counts.
  const total = [...blobs.values()].reduce(
    (sum, blob) => sum + (blob.paths.length ? blob.size : 0),
    0,
  );
  return {
    blobs: [...blobs.values()],
    exceptions: [...exceptions.values()].map((entry) => ({
      ...entry,
      size: head.get(entry.path).size,
    })),
    reusedPaths,
    total,
    failed:
      total > limits.total ||
      [...blobs.values()].some(
        (blob) => blob.paths.length && blob.size > limits.file,
      ),
  };
}

/** Render human-readable binary sizes without losing the byte value in reports. */
const formatSize = (bytes) =>
  bytes < MIB
    ? `${(bytes / KIB).toFixed(1)} KiB`
    : `${(bytes / MIB).toFixed(2)} MiB`;
const escapeMessage = (value) =>
  value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const escapeProperty = (value) =>
  escapeMessage(value).replaceAll(':', '%3A').replaceAll(',', '%2C');

/** Create a GitHub Actions annotation without allowing path/message injection. */
export function annotation(level, message, file) {
  return `::${level}${file ? ` file=${escapeProperty(file)}` : ''}::${escapeMessage(message)}`;
}

/**
 * Format one human-readable report plus GitHub Actions warning/error commands.
 *
 * The report includes allowlisted paths so approved exceptions remain visible
 * in CI rather than silently disappearing from the budget decision.
 */
export function formatReport(result) {
  const lines = ['Media budget report:'];
  for (const blob of result.blobs) {
    lines.push(
      `  ${formatSize(blob.size)} (${blob.size} bytes) ${blob.oid.slice(0, 12)}`,
    );
    for (const file of blob.paths) {
      lines.push(`    ${JSON.stringify(file)}`);
      const remedy =
        'Optimize with scripts/media/process-doc-media.sh or upload to the documentation CDN.';
      if (blob.size > limits.file) {
        lines.push(
          annotation(
            'error',
            `${file}: ${formatSize(blob.size)} (${blob.size} bytes) exceeds the ${formatSize(limits.file)} per-file limit. ${remedy}`,
            file,
          ),
        );
      } else if (blob.size > limits.warning) {
        lines.push(
          annotation(
            'warning',
            `${file}: ${formatSize(blob.size)} (${blob.size} bytes) exceeds the ${formatSize(limits.warning)} warning threshold. ${remedy}`,
            file,
          ),
        );
      }
    }
    for (const file of blob.exemptPaths)
      lines.push(`    ${JSON.stringify(file)} (allowlisted path)`);
  }
  for (const entry of result.exceptions) {
    lines.push(
      `  Exception: ${JSON.stringify(entry.path)} ${formatSize(entry.size)} ${entry.blobOid}; ${JSON.stringify(entry.reason)}; ${JSON.stringify(entry.issue)}`,
    );
  }
  if (!result.blobs.length) lines.push('  No new media blobs.');
  lines.push(
    `Budgeted new media: ${result.blobs.filter((blob) => blob.paths.length).length} unique blob(s), ${formatSize(result.total)} (${result.total} bytes).`,
  );
  lines.push(`Reused media: ${result.reusedPaths} changed path(s), excluded.`);
  if (result.total > limits.total) {
    lines.push(
      annotation(
        'error',
        `New media totals ${formatSize(result.total)} (${result.total} bytes), exceeding the ${formatSize(limits.total)} change budget. Optimize, upload to the documentation CDN, or request a reviewed path + blobOid exception.`,
      ),
    );
  }
  lines.push(
    result.failed ? '[media-budget] failed' : '[media-budget] success',
  );
  return lines.join('\n');
}

/** CLI boundary: budget violations are exit 1; invalid Git/policy is exit 2. */
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 4)
      throw new Error(
        'Usage: node scripts/media/check-budget.mjs <base-ref> <head-ref>',
      );
    const result = checkBudget(process.cwd(), ...process.argv.slice(2));
    console.log(formatReport(result));
    process.exitCode = result.failed ? 1 : 0;
  } catch (error) {
    console.error(
      annotation(
        'error',
        `Media budget configuration/Git error: ${error.message}`,
      ),
    );
    process.exitCode = 2;
  }
}
