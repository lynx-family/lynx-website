/**
 * Shared configuration for compat data directories.
 *
 * This module provides a function to dynamically discover compat data directories
 * by scanning the top-level directory structure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(dirname, '..', '..');

/**
 * Directories that are not compat data directories.
 * These are excluded from validation and linting:
 * - .vscode: IDE configuration
 * - platforms: Platform definitions (separate schema)
 * - schemas: JSON schemas for validation
 * - scripts: Build/lint scripts
 * - test: Test files
 * - types: TypeScript type definitions
 * - node_modules: Dependencies
 */
const EXCLUDED_DIRS = [
  '.vscode',
  'platforms',
  'schemas',
  'scripts',
  'test',
  'types',
  'node_modules',
];

/**
 * Get the list of compat data directories by scanning the top-level directory.
 * This automatically discovers directories like 'lynx-api', 'css', 'elements', etc.
 *
 * Note: Uses synchronous file system operations since this is called at script
 * startup and the directory listing is small.
 */
export function getCompatDataDirs(): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !EXCLUDED_DIRS.includes(entry.name),
    )
    .map((entry) => entry.name);
}

export { rootDir };
