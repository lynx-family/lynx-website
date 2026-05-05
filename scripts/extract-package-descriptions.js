const fs = require('fs');
const path = require('path');

const packagesDir = path.resolve(
  __dirname,
  '../../lynx-ui/lynx-ui-open-source/packages',
);
const outputJsonPath = path.resolve(
  __dirname,
  '../src/components/packageDescriptions.json',
);

const descriptions = {};

if (!fs.existsSync(packagesDir)) {
  console.error(`Packages directory not found: ${packagesDir}`);
  process.exit(1);
}

const folders = fs.readdirSync(packagesDir);
folders.forEach((folder) => {
  const fullPath = path.join(packagesDir, folder);
  if (!fs.statSync(fullPath).isDirectory()) return;

  const readmePath = path.join(fullPath, 'README.md');
  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, 'utf-8');
    const lines = content.split('\n');

    let description = '';
    let foundHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ')) {
        foundHeader = true;
        continue;
      }

      // If we've passed the header and found a non-empty line
      if (foundHeader && line.length > 0) {
        // Skip lines that look like badges (markdown image links, HTML tags, etc.)
        if (
          line.startsWith('[!') ||
          line.startsWith('<') ||
          line.startsWith('![')
        ) {
          continue;
        }

        // This is likely the first paragraph
        description = line;

        // If the paragraph spans multiple lines, we can try to join them
        // but typically a short intro is one line or a single paragraph block
        let j = i + 1;
        while (j < lines.length && lines[j].trim().length > 0) {
          description += ' ' + lines[j].trim();
          j++;
        }

        break;
      }
    }

    if (description) {
      descriptions[folder] = description;
    }
  }
});

// Ensure output directory exists
const outputDir = path.dirname(outputJsonPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  outputJsonPath,
  JSON.stringify(descriptions, null, 2),
  'utf-8',
);
console.log(
  `✅ Extracted descriptions for ${Object.keys(descriptions).length} packages.`,
);
console.log(`📂 Saved to: ${outputJsonPath}`);
