import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const byLower = new Map();

for (const file of files) {
  const key = file.toLowerCase();
  const existing = byLower.get(key) ?? [];
  existing.push(file);
  byLower.set(key, existing);
}

const collisions = [...byLower.values()]
  .filter((paths) => paths.length > 1)
  .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));

if (collisions.length > 0) {
  console.error('Case-insensitive path collisions detected:');
  for (const paths of collisions) {
    console.error(`  - ${paths.join(' | ')}`);
  }
  process.exit(1);
}
