import { readFileSync } from 'fs';
const data = JSON.parse(
  readFileSync('./packages/lynx-compat-data/api-stats.json', 'utf-8'),
);
const platforms = [
  'android',
  'ios',
  'harmony',
  'web_lynx',
  'clay_android',
  'clay_ios',
  'clay_macos',
  'clay_windows',
];
const features = data.features;

function isSup(f, p) {
  const s = f.support[p];
  return s && s.version_added !== false && s.version_added !== null;
}

// Count how many platforms support each feature
const bySupportCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];
features.forEach((f) => {
  const count = platforms.filter((p) => isSup(f, p)).length;
  bySupportCount[count]++;
});

console.log('=== Distribution of features by # of platforms supporting ===');
bySupportCount.forEach((c, i) => {
  if (c > 0) console.log(`  ${i} platforms: ${c} features`);
});

const total1 = features.filter((f) =>
  platforms.some((p) => isSup(f, p)),
).length;
const total2 = features.filter(
  (f) => platforms.filter((p) => isSup(f, p)).length >= 2,
).length;
console.log('');
console.log(`Threshold: >=1 platform (current): ${total1} total`);
console.log(`Threshold: >=2 platforms:           ${total2} total`);

console.log('');
console.log('Platform         | supported | >=1 (%)  | >=2 (%)');
console.log('-'.repeat(55));
for (const p of platforms) {
  const sup = features.filter((f) => isSup(f, p)).length;
  const pct1 = Math.round((sup / total1) * 100);
  const pct2 = Math.round((sup / total2) * 100);
  console.log(
    `  ${p.padEnd(15)} | ${String(sup).padStart(5)}     | ${String(pct1).padStart(3)}%     | ${String(pct2).padStart(3)}%`,
  );
}

// Features supported by exactly 1 platform
console.log('');
console.log(
  '=== Features supported by EXACTLY 1 platform (platform-exclusive) ===',
);
const singlePlatform = {};
features.forEach((f) => {
  const sups = platforms.filter((p) => isSup(f, p));
  if (sups.length === 1) {
    const p = sups[0];
    if (!singlePlatform[p]) singlePlatform[p] = [];
    singlePlatform[p].push(f.name);
  }
});
let totalExclusive = 0;
for (const [p, apis] of Object.entries(singlePlatform).sort(
  (a, b) => b[1].length - a[1].length,
)) {
  console.log(`  ${p}-only: ${apis.length} APIs`);
  totalExclusive += apis.length;
  apis.forEach((a) => console.log(`    - ${a}`));
  console.log('');
}
console.log(
  `  Total exclusive: ${totalExclusive} / ${total1} = ${Math.round((totalExclusive / total1) * 100)}%`,
);

// For Android specifically: where does its 9% gap come from with >=1 threshold?
console.log('');
console.log('=== Android gap analysis (with >=2 threshold) ===');
const relevant2 = features.filter(
  (f) => platforms.filter((p) => isSup(f, p)).length >= 2,
);
const androidSup2 = relevant2.filter((f) => isSup(f, 'android')).length;
const androidMiss2 = relevant2.filter((f) => !isSup(f, 'android'));
console.log(
  `Android: ${androidSup2} / ${relevant2.length} = ${Math.round((androidSup2 / relevant2.length) * 100)}%`,
);
console.log(`Missing (${androidMiss2.length}):`);
androidMiss2.forEach((f) => {
  const sups = platforms.filter((p) => isSup(f, p));
  console.log(`  - ${f.name} [${f.category}] -> ${sups.join(', ')}`);
});
