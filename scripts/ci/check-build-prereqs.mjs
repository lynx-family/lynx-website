import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const required = [
  'docs/public/lynx-compat-data/api-stats.json',
  'docs/public/lynx-examples/text/example-metadata.json',
  'docs/public/lynx-examples/css-api/example-metadata.json',
];

const missing = required.filter((p) => !existsSync(p));
if (missing.length === 0) process.exit(0);

console.warn("Required public assets are missing - the `prepare` lifecycle hook did not run.");
console.warn("Missing:");
for (const p of missing) console.warn(`  - ${p}`);
console.warn("This typically means a CI cache hit short-circuited install. Auto-recovering...\n");

try {
  execSync('pnpm run prepare', { stdio: 'inherit' });
} catch {
  console.error("\nAuto-recovery failed: `pnpm run prepare` exited non-zero.");
  process.exit(1);
}

const stillMissing = required.filter((p) => !existsSync(p));
if (stillMissing.length > 0) {
  console.error("\nRecovery did not restore expected files:");
  for (const p of stillMissing) console.error(`  - ${p}`);
  process.exit(1);
}

console.warn("Prepare didn't run pre-build, auto-recovered. Continuing with build.\n");
