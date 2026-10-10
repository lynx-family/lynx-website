const fs = require('node:fs');
const path = require('node:path');

/**
 * Read the package owner without creating, removing, or modifying any files.
 *
 * An absent, malformed, or unnamed manifest has no ownership claim. Callers
 * reject that state for sources but may replace a target left in that state.
 */
function readPackageOwner(packageDir) {
  const packageJSONPath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packageJSONPath)) {
    return undefined;
  }

  try {
    const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
    return typeof packageJSON.name === 'string' && packageJSON.name.trim()
      ? packageJSON.name.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Require a source package owner before generating an output ID.
 *
 * @returns {string} The normalized package.json name.
 */
function assertExampleSourceOwnership(sourceDir, outputId) {
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

module.exports = {
  assertExampleOutputIdOwnership,
  assertExampleOutputOwnership,
  assertExampleSourceOwnership,
};
