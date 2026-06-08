/**
 * This script generates CSS property compat data files from @lynx-js/css-defines.
 *
 * It reads all CSS property definition files from the css-defines package,
 * extracts the `compat_data` field, wraps it in the lynx-compat-data BCD format
 * (`css.properties.<name>`), and writes it to `css/properties/<name>.json`.
 *
 * After generating from css-defines, it copies any hand-maintained files from
 * `css/properties-manual/` into `css/properties/`. The manual directory is the
 * single source of truth for properties not yet covered by css-defines; a
 * filename collision between the two sources is treated as a hard error.
 *
 * This makes @lynx-js/css-defines the source of truth for CSS property
 * compatibility data, with `css/properties-manual/` as an explicit escape hatch.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findCssDefinesDir(): string {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', '@lynx-js', 'css-defines', 'css_defines'),
    path.join(__dirname, '..', '..', '..', 'node_modules', '@lynx-js', 'css-defines', 'css_defines'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'Could not find @lynx-js/css-defines/css_defines directory',
  );
}

const cssDefinesDir = findCssDefinesDir();

// Output directory for generated CSS property compat data
const outputDir = path.join(__dirname, '..', 'css', 'properties');

// Source directory for hand-maintained property files (properties not yet
// covered by @lynx-js/css-defines). Tracked in git; copied into outputDir.
const manualDir = path.join(__dirname, '..', 'css', 'properties-manual');

/**
 * Generate CSS property compat data files from @lynx-js/css-defines.
 */
async function generateCssProperties(): Promise<void> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Read all definition files from css-defines
  const files = await fs.readdir(cssDefinesDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  console.log(
    `Found ${jsonFiles.length} CSS property definition files in @lynx-js/css-defines`,
  );

  let generated = 0;
  let skipped = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(cssDefinesDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const definition = JSON.parse(content);

    // Skip definitions without compat_data
    if (!definition.compat_data) {
      console.log(`  Skipping ${definition.name || file}: no compat_data`);
      skipped++;
      continue;
    }

    const propertyName = definition.name;
    if (!propertyName) {
      console.warn(`  Warning: ${file} has no name field, skipping`);
      skipped++;
      continue;
    }

    // Transform css-defines compat_data into lynx-compat-data BCD format
    // css-defines: { "property-name": { "__compat": {...}, "sub-feature": {...} } }
    // lynx-compat-data: { "css": { "properties": { "property-name": { "__compat": {...}, "sub-feature": {...} } } } }
    const compatData = definition.compat_data;

    // Verify that the compat_data key matches the property name
    if (!compatData[propertyName]) {
      const keys = Object.keys(compatData);
      console.warn(
        `  Warning: ${file} compat_data keys [${keys.join(', ')}] don't match property name "${propertyName}"`,
      );
    }

    const output = {
      css: {
        properties: compatData,
      },
    };

    // Write the output file
    const outputFile = path.join(outputDir, `${propertyName}.json`);
    await fs.writeFile(outputFile, JSON.stringify(output, null, 2) + '\n');
    generated++;
  }

  console.log(`\nGenerated ${generated} CSS property compat data files`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} files`);
  }

  // Copy hand-maintained files. The directory listing IS the allowlist —
  // no name is hardcoded here. Conflicts with css-defines fail the build.
  let copied = 0;
  if (existsSync(manualDir)) {
    const manualFiles = (await fs.readdir(manualDir)).filter((f) =>
      f.endsWith('.json'),
    );
    for (const file of manualFiles) {
      const dst = path.join(outputDir, file);
      if (existsSync(dst)) {
        throw new Error(
          `Property "${file}" exists in both css-defines and css/properties-manual/. ` +
            `Remove it from properties-manual/ now that css-defines covers it.`,
        );
      }
      await fs.copyFile(path.join(manualDir, file), dst);
      copied++;
    }
    console.log(`Copied ${copied} hand-maintained files from properties-manual/`);
  }

  console.log(`Output directory: ${outputDir}`);
}

generateCssProperties().catch((error) => {
  console.error('Error generating CSS properties:', error);
  process.exit(1);
});
