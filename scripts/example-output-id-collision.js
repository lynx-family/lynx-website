/**
 * Read-only ownership checks for collisions in the flat lynx-examples output
 * ID namespace. Generators use these checks before copying any package files.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Keep every output ID inside the flat lynx-examples namespace.
 */
function assertExampleOutputId(outputId) {
  if (
    typeof outputId !== 'string' ||
    outputId.length === 0 ||
    outputId === '.' ||
    outputId === '..' ||
    outputId.includes('/') ||
    outputId.includes('\\')
  ) {
    throw new Error(
      `Invalid example output ID "${String(outputId)}": expected a single non-empty path segment`,
    );
  }
}

/**
 * Read the package owner without creating, removing, or modifying any files.
 *
 * An absent or unnamed manifest has no ownership claim. Malformed manifests
 * and filesystem errors are invalid states and propagate to the caller.
 */
function readPackageOwner(packageDir) {
  const packageJSONPath = path.join(packageDir, 'package.json');
  let content;
  try {
    content = fs.readFileSync(packageJSONPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return undefined;
    }
    throw error;
  }

  const packageJSON = JSON.parse(content);
  return typeof packageJSON.name === 'string' && packageJSON.name.trim()
    ? packageJSON.name.trim()
    : undefined;
}

/**
 * Require a source package owner before generating an output ID.
 *
 * @returns {string} The normalized package.json name.
 */
function assertExampleSourceOwnership(sourceDir, outputId) {
  assertExampleOutputId(outputId);
  const sourceOwner = readPackageOwner(sourceDir);
  if (!sourceOwner) {
    throw new Error(
      `Example output "${outputId}" has no valid source package owner`,
    );
  }
  return sourceOwner;
}

/**
 * Reject two known package owners that claim the same generated output ID.
 *
 * An undefined existing owner means no package currently claims the ID. This
 * covers both an absent target and incomplete generated output.
 */
function assertExampleOutputIdOwnership(
  outputId,
  existingOwner,
  incomingOwner,
) {
  if (!existingOwner || existingOwner === incomingOwner) {
    return;
  }

  throw new Error(
    `Example output ID collision for "${outputId}": existing owner ${
      existingOwner
    }, incoming owner ${incomingOwner}`,
  );
}

/**
 * Validate an incremental output ID before the caller mutates its target.
 *
 * This function is intentionally idempotent and read-only. Callers should
 * preflight every source package before starting a batch copy. The returned
 * source owner lets a caller also detect duplicate IDs inside its input batch.
 *
 * @returns {string} The validated incoming package owner.
 */
function assertExampleOutputOwnership(sourceDir, targetDir, outputId) {
  const sourceOwner = assertExampleSourceOwnership(sourceDir, outputId);
  const targetOwner = readPackageOwner(targetDir);
  assertExampleOutputIdOwnership(outputId, targetOwner, sourceOwner);
  return sourceOwner;
}

/**
 * Validate a complete generator batch before any caller starts copying.
 *
 * Each record identifies one source package and its flat output ID. Incremental
 * callers also provide existing target directories; full rebuilds skip those
 * disk checks because the shared output root will be removed after preflight.
 * Incoming owners are also compared with each other so duplicate output IDs
 * fail independently of the current disk state.
 *
 * @param {Array<{ outputId: string, sourceDir: string, targetDir: string }>} records
 * @param {{ checkExistingTargets?: boolean }} options
 */
function assertExampleOutputBatchOwnership(
  records,
  { checkExistingTargets = true } = {},
) {
  const incomingOwners = new Map();

  records.forEach(({ outputId, sourceDir, targetDir }) => {
    const sourceOwner = checkExistingTargets
      ? assertExampleOutputOwnership(sourceDir, targetDir, outputId)
      : assertExampleSourceOwnership(sourceDir, outputId);

    if (incomingOwners.has(outputId)) {
      throw new Error(
        `Duplicate incoming example output ID "${outputId}": first owner ${incomingOwners.get(outputId)}, duplicate owner ${sourceOwner}`,
      );
    }
    incomingOwners.set(outputId, sourceOwner);
  });
}

module.exports = {
  assertExampleOutputBatchOwnership,
  assertExampleOutputIdOwnership,
  assertExampleOutputOwnership,
  assertExampleSourceOwnership,
};
