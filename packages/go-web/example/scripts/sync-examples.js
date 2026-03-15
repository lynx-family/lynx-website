/**
 * Queries the npm registry for all @lynx-example/* packages and installs
 * any that are missing from package.json.
 *
 * Usage:
 *   pnpm sync-examples          # discover & install new packages
 *   node scripts/sync-examples.js --dry-run   # just print what's missing
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, '..', 'package.json');
const dryRun = process.argv.includes('--dry-run');

async function fetchAllLynxExamples() {
  // npm registry search API — fetch up to 250 packages in the @lynx-example scope
  const url =
    'https://registry.npmjs.org/-/v1/search?text=scope:lynx-example&size=250';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Registry query failed: HTTP ${res.status}`);
  const data = await res.json();
  return data.objects
    .map((obj) => obj.package.name)
    .filter((name) => name.startsWith('@lynx-example/'))
    .sort();
}

async function main() {
  console.log('Querying npm registry for @lynx-example/* packages…');
  const allPackages = await fetchAllLynxExamples();
  console.log(`Found ${allPackages.length} packages on npm.`);

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const existing = new Set(
    Object.keys(pkg.dependencies).filter((k) => k.startsWith('@lynx-example/')),
  );

  const missing = allPackages.filter((name) => !existing.has(name));

  if (missing.length === 0) {
    console.log('All @lynx-example packages are already in package.json.');
    return;
  }

  console.log(`\n${missing.length} new package(s):`);
  for (const name of missing) {
    console.log(`  + ${name}`);
  }

  if (dryRun) {
    console.log('\n(dry-run — no changes made)');
    return;
  }

  const args = missing.map((n) => `${n}@latest`).join(' ');
  console.log(`\nInstalling…`);
  execSync(`pnpm add ${args}`, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  console.log('\nDone. Run `pnpm prepare` to regenerate example data.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
