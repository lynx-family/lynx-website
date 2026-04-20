const fs = require('fs');
const path = require('path');

const packagesDir = path.resolve(
  __dirname,
  '../node_modules/@lynx-js/lynx-ui/packages',
);
const result = {};

if (!fs.existsSync(packagesDir)) {
  console.error('Packages directory not found:', packagesDir);
  process.exit(1);
}

const packages = fs.readdirSync(packagesDir);

for (const pkg of packages) {
  const readmePath = path.join(packagesDir, pkg, 'README.md');
  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let foundHeader = false;
    let intro = '';

    for (const line of lines) {
      if (line.startsWith('# ')) {
        foundHeader = true;
        continue;
      }
      if (foundHeader && line.trim().length > 0) {
        intro = line.trim();
        break;
      }
    }

    if (intro) {
      result[pkg] = intro;
    }
  }
}

const outputPath = path.resolve(__dirname, '../sharedDocs/lynx-ui-intros.json');
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

console.log(
  'Successfully extracted introductions to sharedDocs/lynx-ui-intros.json!',
);
