import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (args.length === 0) {
  process.exit(0);
}

const violations = [];

for (const file of args) {
  if (!file.endsWith('.mdx')) continue;
  // Only check API reference pages, not guides that use APITable inline
  if (!file.includes('/api/')) continue;
  // Skip the API-only reference partials (e.g. image-API.mdx)
  if (file.endsWith('-API.mdx')) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const hasAPITable = content.includes('<APITable');
  const hasAPISummary = content.includes('<APISummary');

  if (hasAPITable && !hasAPISummary) {
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error(
    'Files using <APITable> must also include <APISummary /> after the heading:',
  );
  for (const file of violations) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}
