#!/usr/bin/env node
/**
 * Linter script to check for improperly named keys in compat data JSON files.
 *
 * This script checks for:
 * 1. Keys like "nested_value_N" that should be extracted from the description field
 * 2. Keys with description fields containing <code>name</code> patterns that should be the key itself
 *
 * Usage:
 *   pnpm run lint:keys         # Check for issues
 *   pnpm run lint:keys --fix   # Auto-fix issues
 */

import fs from 'node:fs';
import path from 'node:path';

import { getCompatDataDirs, rootDir } from './lib/compat-dirs.js';

// Pattern to match keys that indicate improper naming
const IMPROPER_KEY_PATTERNS = [/^nested_value_\d+$/, /^unsupported_value_\d*$/];

// Pattern to extract name from description with <code>name</code> format
const CODE_DESCRIPTION_PATTERN = /^<code>([^<]+)<\/code>$/;

interface Issue {
  file: string;
  path: string;
  currentKey: string;
  suggestedKey: string;
  description: string;
}

interface FixResult {
  file: string;
  fixed: number;
  issues: Issue[];
}

/**
 * Extract the actual name from a description field
 * Handles formats like "<code>bounces</code>" -> "bounces"
 */
function extractNameFromDescription(description: string): string | null {
  const match = description.match(CODE_DESCRIPTION_PATTERN);
  if (match) {
    // Clean up the extracted name - replace spaces with hyphens, etc.
    return match[1].trim();
  }
  return null;
}

/**
 * Check if a key is improperly named
 */
function isImproperKey(key: string): boolean {
  return IMPROPER_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Make a key valid for JSON schema pattern `^(?!__compat)[a-zA-Z_0-9-$@]*$`
 */
function sanitizeKey(key: string): string {
  // Replace spaces with hyphens, remove invalid characters
  return key
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z_0-9\-$@]/g, '')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Recursively check an object for improperly named keys
 */
function checkObject(
  obj: Record<string, unknown>,
  filePath: string,
  currentPath: string,
  issues: Issue[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__compat') {
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const valueObj = value as Record<string, unknown>;
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      // Check if this key is improperly named
      if (isImproperKey(key)) {
        const compat = valueObj.__compat as Record<string, unknown> | undefined;
        if (compat && typeof compat.description === 'string') {
          const suggestedKey = extractNameFromDescription(compat.description);
          if (suggestedKey) {
            const sanitized = sanitizeKey(suggestedKey);
            if (sanitized && sanitized !== key) {
              issues.push({
                file: filePath,
                path: newPath,
                currentKey: key,
                suggestedKey: sanitized,
                description: compat.description,
              });
            }
          }
        }
      }

      // Recursively check nested objects
      checkObject(valueObj, filePath, newPath, issues);
    }
  }
}

/**
 * Recursively fix improperly named keys in an object
 * Returns true if any changes were made
 */
function fixObject(obj: Record<string, unknown>, issues: Issue[]): boolean {
  let changed = false;

  const keys = Object.keys(obj);
  for (const key of keys) {
    if (key === '__compat') {
      continue;
    }

    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      const valueObj = value as Record<string, unknown>;

      // Check if this key needs to be renamed
      if (isImproperKey(key)) {
        const compat = valueObj.__compat as Record<string, unknown> | undefined;
        if (compat && typeof compat.description === 'string') {
          const suggestedKey = extractNameFromDescription(compat.description);
          if (suggestedKey) {
            const sanitized = sanitizeKey(suggestedKey);
            if (sanitized && sanitized !== key && !obj[sanitized]) {
              // Rename the key by creating new entry and deleting old
              obj[sanitized] = value;
              delete obj[key];
              changed = true;
            }
          }
        }
      }

      // Recursively fix nested objects
      if (fixObject(valueObj, issues)) {
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * Process a single file
 */
function processFile(filePath: string, fix: boolean): Issue[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  const issues: Issue[] = [];

  checkObject(data, filePath, '', issues);

  if (fix && issues.length > 0) {
    fixObject(data, issues);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }

  return issues;
}

/**
 * Process all compat data files
 */
function processAllFiles(fix: boolean): FixResult[] {
  const results: FixResult[] = [];
  const compatDataDirs = getCompatDataDirs();

  for (const dir of compatDataDirs) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) {
      continue;
    }

    const processDir = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          processDir(entryPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          const issues = processFile(entryPath, fix);
          if (issues.length > 0) {
            results.push({
              file: path.relative(rootDir, entryPath),
              fixed: fix ? issues.length : 0,
              issues,
            });
          }
        }
      }
    };

    processDir(dirPath);
  }

  return results;
}

// Main
const args = process.argv.slice(2);
const fix = args.includes('--fix');

console.log(
  fix
    ? 'Checking and fixing improperly named keys...'
    : 'Checking for improperly named keys...',
);
console.log();

const results = processAllFiles(fix);

if (results.length === 0) {
  console.log('✅ No issues found!');
  process.exit(0);
}

let totalIssues = 0;
for (const result of results) {
  console.log(`📄 ${result.file}`);
  for (const issue of result.issues) {
    totalIssues++;
    if (fix) {
      console.log(
        `   ✅ Fixed: "${issue.currentKey}" → "${issue.suggestedKey}"`,
      );
    } else {
      console.log(
        `   ⚠️  "${issue.currentKey}" should be "${issue.suggestedKey}" (from: ${issue.description})`,
      );
    }
  }
  console.log();
}

console.log(`Total: ${totalIssues} issue(s) ${fix ? 'fixed' : 'found'}`);

if (!fix && totalIssues > 0) {
  console.log('\nRun with --fix to auto-fix these issues.');
  process.exit(1);
}
