/* This file is a part of lynx-compat-data
 * See LICENSE file for more information. */

/**
 * This script is used to generate the platforms.json and platform-keys.json files.
 * It reads all the [platform].json files in the platforms directory and combines them into a single platforms.json file.
 * It also generates a platform-keys.json file which contains the keys of the platforms.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * TODO(xuan.huang):
 * 1. Add generated JSON files to .gitignore
 * 2. Require the website to build compat-data first
 * 3. Convert compat-data into an npm package
 */
const platformsDir = path.join(__dirname, '..', 'platforms');
const outputFile = path.join(__dirname, '..', 'platforms', 'platforms.json');
const keysOutputFile = path.join(
  __dirname,
  '..',
  'platforms',
  'platform-keys.json',
);

async function readJsonFiles(directory: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  const files = await fs.readdir(directory);

  for (const file of files) {
    if (
      file.endsWith('.json') &&
      file !== 'platforms.json' &&
      file !== 'platform-keys.json'
    ) {
      const filePath = path.join(directory, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const jsonContent = JSON.parse(content);

      // Extract the platform key and content
      const platformKey = Object.keys(jsonContent.platforms)[0];
      const platformContent = jsonContent.platforms[platformKey];

      result[platformKey] = platformContent;
    }
  }

  return result;
}

async function generateCombinedPlatforms(): Promise<void> {
  const platforms = await readJsonFiles(platformsDir);

  await fs.writeFile(outputFile, JSON.stringify({ platforms }, null, 2));
  console.log(`Combined platforms data written to ${outputFile}`);

  // Generate platform-keys.json
  const platformKeys = Object.keys(platforms);
  await fs.writeFile(
    keysOutputFile,
    JSON.stringify({ platforms: platformKeys }, null, 2),
  );
  console.log(`Platform keys written to ${keysOutputFile}`);
}

generateCombinedPlatforms().catch(console.error);
