/**
 * This script is responsible for processing example files located in a specified directory.
 * It performs the following main tasks:
 * 1. Retrieves all files from the given directory and its subdirectories.
 * 2. Filters and identifies template files based on specific naming conventions.
 * 3. Sorts the files, prioritizing directories over regular files.
 * 4. Generates a JSON file for each example, containing metadata such as:
 *    - The name of the example
 *    - A list of sorted file paths
 *    - The path to a preview image (if available)
 *    - A list of template files associated with the example
 *
 * Example JSON structure:
 * {
 *   "name": "view",
 *   "files": [
 *     "dist/main.lynx.bundle",
 *     "src/App.tsx",
 *     "src/index.tsx",
 *     "rsbuild.config.ts",
 *     "package.json",
 *     "README.md"
 *   ],
 *   "templateFiles": [
 *     {
 *       "name": "main",
 *       "file": "dist/main.lynx.bundle"
 *     }
 *   ],
 *   "previewImage": "preview-image.png"
 * }
 *
 * The script also copies the example files into the public output directory.
 */

const fs = require('fs');
const path = require('path');
const {
  assertExampleOutputBatchOwnership,
} = require('./example-output-id-collision');

const currentDir = process.cwd();
const examplesDir = path.join(
  currentDir,
  process.env.EXAMPLES_DIR ||
    'packages/lynx-example-packages/node_modules/@lynx-example',
);
const lynxEntryFileName = process.env.LYNX_ENTRY_FILE_NAME || '.lynx.bundle';
const webEntryFileName = process.env.WEB_ENTRY_FILE_NAME || '.web.bundle';
const removeLinkPath =
  (process.env.REMOVE_LINK_PATH || 'true').toLowerCase() === 'true';
const exampleGitBaseUrl =
  process.env.EXAMPLE_GIT_BASE_URL ||
  'https://github.com/lynx-family/lynx-examples/tree/main';

// Optional: inject a top-level `nativeFramework` field into every generated
// example-metadata.json. go-web reads this to pick the
// correct deep-link scheme and hide the QR tab for native-only examples.
const nativeFramework = process.env.NATIVE_FRAMEWORK || '';

const linkPath = path.join(
  currentDir,
  process.env.LINK_PATH || 'docs/public/lynx-examples',
);
const ignoreDirs = ['node_modules', '.git', '.turbo'];
const ignoreFiles = ['.DS_Store', 'LICENSE'];
const previewImageFilePattern = /^preview-image\.(png|jpg|jpeg|webp|gif)$/;

/**
 * Get all files in the specified directory
 * @param {string} dirPath - The directory path
 * @param {Array} arrayOfFiles - The array to store file paths
 * @returns {Array} - An array of all file paths
 */
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);

    if (fs.statSync(fullPath).isDirectory()) {
      const dirName = path.basename(fullPath);
      if (ignoreDirs.includes(dirName)) {
        return;
      }
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (ignoreFiles.includes(file)) {
        return;
      }
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Copy one package into its already-approved output directory.
 */
function copyExampleFiles(sourceDir, targetDir) {
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    dereference: true,
    preserveTimestamps: true,
    force: true,
    filter: (source) => {
      if (source === sourceDir) {
        return true;
      }
      const name = path.basename(source);
      return !ignoreDirs.includes(name) && !ignoreFiles.includes(name);
    },
  });
}

/**
 * Get all .lynx.bundle|.web.bundle files
 * @param {Array} allFiles - An array of all file paths
 * @param {string | undefined} webHostFile - Optional full Web app entry
 * @param {(file: string) => boolean} templateFileFilter - Select entry bundles
 * @returns {Array} - An array of template files
 */
function getTemplateFiles(
  allFiles,
  webHostFile,
  templateFileFilter = () => true,
) {
  const entries = [];
  allFiles.forEach((file) => {
    if (file.endsWith(lynxEntryFileName) && templateFileFilter(file)) {
      const parts = file.split('/');
      const fileName = parts[parts.length - 1];
      const baseName = fileName.replace(lynxEntryFileName, '');
      const parentDir = parts.length > 1 ? parts[parts.length - 2] : '';
      // Default name is the bundle basename (e.g. "main" from "main.lynx.bundle").
      // Fall back to parent directory name if the bundle file has no base name
      // (e.g. a bare ".lynx.bundle" file).
      const name = baseName || parentDir || fileName;
      const entry = {
        name,
        file,
      };
      const webFile = file.replace(lynxEntryFileName, webEntryFileName);
      if (allFiles.includes(webFile)) {
        entry.webFile = webFile;
      }
      if (webHostFile && allFiles.includes(webHostFile)) {
        entry.webHostFile = webHostFile;
      }
      entries.push(entry);
    }
  });

  // Preserve basename-only names for the common case. Path-derived names are
  // introduced only within collision groups so existing selectors stay stable.
  const entriesByName = new Map();
  entries.forEach((entry) => {
    const group = entriesByName.get(entry.name) ?? [];
    group.push(entry);
    entriesByName.set(entry.name, group);
  });

  for (const group of entriesByName.values()) {
    if (group.length < 2) {
      continue;
    }
    const states = group.map((entry) => {
      const segments = entry.file
        .slice(0, -lynxEntryFileName.length)
        .split('/')
        .filter(Boolean);
      return {
        entry,
        segments,
        // The basename is already known to collide. Start with its parent plus
        // basename, which is the shortest suffix that can distinguish it.
        depth: Math.min(2, segments.length),
      };
    });

    while (true) {
      const statesByCandidate = new Map();
      states.forEach((state) => {
        const candidate = state.segments.slice(-state.depth).join('/');
        const candidates = statesByCandidate.get(candidate) ?? [];
        candidates.push(state);
        statesByCandidate.set(candidate, candidates);
      });
      const collisions = [...statesByCandidate.values()].filter(
        (candidates) => candidates.length > 1,
      );
      if (collisions.length === 0) {
        states.forEach((state) => {
          state.entry.name = state.segments.slice(-state.depth).join('/');
        });
        break;
      }

      // Grow only candidates that still collide. Candidates already unique at
      // a shorter depth keep the shortest stable suffix.
      let changed = false;
      collisions.forEach((candidates) => {
        candidates.forEach((state) => {
          if (state.depth < state.segments.length) {
            state.depth += 1;
            changed = true;
          }
        });
      });
      if (!changed) {
        const files = collisions[0].map(({ entry }) => entry.file).join(', ');
        throw new Error(
          `Could not create unique template entry names: ${files}`,
        );
      }
    }
  }

  // A path-derived name from one basename group can still equal an untouched
  // name from another group. Enforce uniqueness across the final metadata.
  const finalNames = new Set();
  entries.forEach((entry) => {
    if (finalNames.has(entry.name)) {
      throw new Error(`Duplicate template entry name: ${entry.name}`);
    }
    finalNames.add(entry.name);
  });

  return entries;
}

/**
 * Sort the metadata code-file list with nested paths before root-level files.
 *
 * This ordering is only used by metadata.files; templateFiles keeps its
 * separate discovery order.
 *
 * @param {Array} files - An array of file paths
 * @returns {Array} - An array of sorted file paths
 */
function sortFilesByDirectoryFirst(files) {
  // Separate nested paths from files at the example root.
  const directories = files.filter((file) => file.includes('/'));
  const regularFiles = files.filter((file) => !file.includes('/'));

  // Sort each group alphabetically.
  directories.sort((a, b) => a.localeCompare(b));
  regularFiles.sort((a, b) => a.localeCompare(b));

  // Keep nested paths grouped before root-level files.
  return [...directories, ...regularFiles];
}

/**
 * Collect immutable source-to-output records without touching generated data.
 */
function collectExampleRecords(examplesRoot) {
  return fs.readdirSync(examplesRoot).flatMap((outputId) => {
    const sourceDir = path.join(examplesRoot, outputId);
    const targetDir = path.join(linkPath, outputId);
    const stats = fs.statSync(sourceDir);
    if (!stats.isDirectory()) {
      console.warn('exampleDir is not a directory', sourceDir);
      return [];
    }

    const packageJSONPath = path.join(sourceDir, 'package.json');
    if (!fs.existsSync(packageJSONPath)) {
      console.warn('package.json not found', packageJSONPath);
      return [];
    }

    return [
      {
        outputId,
        sourceDir,
        targetDir,
        packageJSON: JSON.parse(fs.readFileSync(packageJSONPath, 'utf8')),
      },
    ];
  });
}

/**
 * Generate flat example outputs through collect, preflight, and materialize
 * phases. No generated data is changed until the complete batch is approved.
 */
function parseExampleData({
  examplesDir: sourceDir = examplesDir,
  removeLinkPath: clearOutput = removeLinkPath,
  exampleGitBaseUrl: gitBaseUrl = exampleGitBaseUrl,
  nativeFramework: framework = nativeFramework,
  webHostFiles = {},
  templateFileFilter,
} = {}) {
  // Phase 1: collect source manifests and their intended flat output IDs.
  const exampleRecords = collectExampleRecords(sourceDir);

  // Phase 2: validate the complete batch without modifying generated data.
  assertExampleOutputBatchOwnership(exampleRecords, {
    checkExistingTargets: !clearOutput,
  });

  if (clearOutput && fs.existsSync(linkPath)) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
  fs.mkdirSync(linkPath, { recursive: true });

  // Phase 3: replace approved outputs and write their metadata.
  exampleRecords.forEach(({ outputId, sourceDir, targetDir, packageJSON }) => {
    // Every approved target is generated data. Replace it instead of merging
    // with an incomplete or stale output from an earlier run.
    fs.rmSync(targetDir, { recursive: true, force: true });
    copyExampleFiles(sourceDir, targetDir);
    const allFiles = getAllFiles(sourceDir, []);

    // Metadata paths are URLs, including on Windows build hosts.
    const files = allFiles.map((file) =>
      path.relative(sourceDir, file).split(path.sep).join('/'),
    );

    // Keep the separately referenced preview image out of the code file list.
    const filesFilters = files.filter(
      (file) =>
        !previewImageFilePattern.test(file) && file !== 'example-metadata.json',
    );

    const sortedFiles = sortFilesByDirectoryFirst(filesFilters);
    const previewImage = files.find((file) =>
      previewImageFilePattern.test(file),
    );
    const webHostFile = Object.hasOwn(webHostFiles, packageJSON.name)
      ? webHostFiles[packageJSON.name]
      : undefined;
    // TODO: templateFiles currently preserves filesystem discovery order.
    // go-web falls back to templateFiles[0] when no defaultEntryName is set,
    // so the first item must not be treated as a stable package declaration.
    const templateFiles = getTemplateFiles(
      filesFilters,
      webHostFile,
      templateFileFilter,
    );
    const metadata = {
      name: packageJSON.repository?.directory || outputId,
      version: packageJSON.version,
      files: sortedFiles,
      previewImage,
      templateFiles,
      exampleGitBaseUrl: packageJSON.exampleGitBaseUrl || gitBaseUrl,
    };
    const exampleNativeFramework = packageJSON.nativeFramework || framework;
    if (exampleNativeFramework) {
      metadata.nativeFramework = exampleNativeFramework;
    }

    fs.writeFileSync(
      path.join(targetDir, 'example-metadata.json'),
      JSON.stringify(metadata, null, 2),
    );
  });
  console.log('lynx-examples link success');
}

/**
 * Main function to execute the script
 */
if (require.main === module) {
  parseExampleData();
}

// Keep the naming helper directly testable without running filesystem setup.
module.exports = { getTemplateFiles, parseExampleData };
