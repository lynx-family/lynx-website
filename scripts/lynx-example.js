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
 * The script also creates a symbolic link to the example files in a public directory for easy access.
 */

const fs = require('fs');
const path = require('path');
const {
  assertExampleOutputOwnership,
  assertExampleSourceOwnership,
} = require('./example-output-ownership');

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

const isPackCopy = true;
const linkPath = path.join(
  currentDir,
  process.env.LINK_PATH || 'docs/public/lynx-examples',
);
const ignoreDirs = ['node_modules', '.git', '.turbo'];
const ignoreFiles = ['.DS_Store', 'LICENSE'];
const exampleFixups = {
  layout: [
    {
      from: 'gird item 3',
      to: 'grid item 3',
    },
  ],
};

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
 *
 * package.json is published first so any non-empty output left by an
 * interrupted copy still identifies the package that was writing it.
 */
function lnExampleFiles(exampleDir, lnExampleDir) {
  if (!fs.existsSync(lnExampleDir)) {
    fs.mkdirSync(lnExampleDir, { recursive: true });
  }

  // Publish package.json first so an interrupted copy still records which
  // package owns any non-empty partial output.
  const files = fs.readdirSync(exampleDir).sort((left, right) => {
    if (left === 'package.json') return -1;
    if (right === 'package.json') return 1;
    return 0;
  });

  files.forEach((file) => {
    const fullPath = path.join(exampleDir, file);
    const targetPath = path.join(lnExampleDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const dirName = path.basename(fullPath);
      if (ignoreDirs.includes(dirName)) {
        return;
      }
      if (isPackCopy) {
        // Ownership preflight runs before this copy, so a collision cannot
        // appear after an earlier example has already been written.
        fs.cpSync(fullPath, targetPath, {
          recursive: true,
          dereference: true,
          preserveTimestamps: true,
          filter: (source) => {
            const name = path.basename(source);
            return !ignoreDirs.includes(name) && !ignoreFiles.includes(name);
          },
        });
      } else {
        fs.symlinkSync(fullPath, targetPath);
      }
    } else {
      if (ignoreFiles.includes(file)) {
        return;
      }
      if (isPackCopy) {
        // Keep the copy operation free of shell commands and preserve source
        // symlink targets in the generated package.
        fs.cpSync(fullPath, targetPath, {
          // Required when dereferencing file symlinks. Node 22 and 24 throw
          // ERR_FS_EISDIR without this option even when the source is a file.
          recursive: true,
          dereference: true,
          preserveTimestamps: true,
        });
      } else {
        fs.symlinkSync(fullPath, targetPath);
      }
    }
  });
}

function replaceBufferContent(buffer, from, to) {
  const fromBuffer = Buffer.from(from);
  const toBuffer = Buffer.from(to);

  if (fromBuffer.length !== toBuffer.length) {
    throw new Error(`Fixup replacement length mismatch: "${from}" -> "${to}"`);
  }

  let index = buffer.indexOf(fromBuffer);
  if (index === -1) {
    return { buffer, changed: false };
  }

  const nextBuffer = Buffer.from(buffer);
  while (index !== -1) {
    toBuffer.copy(nextBuffer, index);
    index = nextBuffer.indexOf(fromBuffer, index + toBuffer.length);
  }

  return { buffer: nextBuffer, changed: true };
}

function applyExampleFixups(example, exampleDir) {
  const fixups = exampleFixups[example];
  if (!fixups?.length) {
    return;
  }

  const files = getAllFiles(exampleDir, []);
  files.forEach((filePath) => {
    let buffer = fs.readFileSync(filePath);
    let changed = false;

    fixups.forEach(({ from, to }) => {
      const result = replaceBufferContent(buffer, from, to);
      if (result.changed) {
        changed = true;
        buffer = result.buffer;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, buffer);
    }
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
 * Sort files with directories first
 * @param {Array} files - An array of file paths
 * @returns {Array} - An array of sorted file paths
 */
function sortFilesByDirectoryFirst(files) {
  // 分离目录和文件
  const directories = files.filter((file) => file.includes('/'));
  const regularFiles = files.filter((file) => !file.includes('/'));

  // 按字母顺序排序
  directories.sort((a, b) => a.localeCompare(b));
  regularFiles.sort((a, b) => a.localeCompare(b));

  // 合并结果
  return [...directories, ...regularFiles];
}

/**
 * Generate flat example outputs and their metadata.
 *
 * The function deliberately separates discovery, ownership preflight, and
 * mutation. Full rebuilds validate source owners before clearing the shared
 * root; incremental callers additionally compare every existing target owner.
 */
function parseExampleData({
  examplesDir: sourceDir = examplesDir,
  removeLinkPath: clearOutput = removeLinkPath,
  exampleGitBaseUrl: gitBaseUrl = exampleGitBaseUrl,
  nativeFramework: framework = nativeFramework,
  webHostFiles = {},
  templateFileFilter,
} = {}) {
  // Capture every source and parsed manifest before checking or changing the
  // output tree. One sourceDir contains one flat package namespace, so its
  // immediate child names are unique output IDs within this batch.
  const exampleRecords = fs.readdirSync(sourceDir).flatMap((example) => {
    const exampleDir = path.join(sourceDir, example);
    const lnExampleDir = path.join(linkPath, example);
    const stats = fs.statSync(exampleDir);
    if (!stats.isDirectory()) {
      console.warn('exampleDir is not a directory', exampleDir);
      return [];
    }

    const packageJSONPath = path.join(exampleDir, 'package.json');
    if (!fs.existsSync(packageJSONPath)) {
      console.warn('package.json not found', packageJSONPath);
      return [];
    }

    return [
      {
        example,
        exampleDir,
        lnExampleDir,
        packageJSON: JSON.parse(fs.readFileSync(packageJSONPath, 'utf8')),
      },
    ];
  });

  // A full rebuild discards the output root, so only source ownership matters;
  // stale owners from a previous install must not block a scope migration.
  // Incremental callers preserve the root and must validate existing targets.
  exampleRecords.forEach(({ exampleDir, lnExampleDir, example }) => {
    if (clearOutput) {
      assertExampleSourceOwnership(exampleDir, example);
    } else {
      assertExampleOutputOwnership(exampleDir, lnExampleDir, example);
    }
  });

  if (clearOutput && fs.existsSync(linkPath)) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
  fs.mkdirSync(linkPath, { recursive: true });

  // Start mutation only after the complete batch has passed preflight.
  exampleRecords.forEach(
    ({ example, exampleDir, lnExampleDir, packageJSON }) => {
      // Every allowed target is generated data. Replace it instead of merging
      // with an incomplete or stale output from an earlier run.
      fs.rmSync(lnExampleDir, { recursive: true, force: true });
      lnExampleFiles(exampleDir, lnExampleDir);
      applyExampleFixups(example, lnExampleDir);
      const allFiles = getAllFiles(exampleDir, []);

      // Metadata paths are URLs, including on Windows build hosts.
      const files = allFiles.map((file) =>
        path.relative(exampleDir, file).split(path.sep).join('/'),
      );

      // preview image
      const previewImageReg = /^preview-image\.(png|jpg|jpeg|webp|gif)$/;

      // Keep generated metadata and the separately referenced preview image
      // out of the code file list.
      const filesFilters = files.filter(
        (file) =>
          !previewImageReg.test(file) && file !== 'example-metadata.json',
      );

      const sortedFiles = sortFilesByDirectoryFirst(filesFilters);
      const jsonFilePath = path.join(lnExampleDir, 'example-metadata.json');
      const previewImage = files.find((file) => previewImageReg.test(file));
      const webHostFile = Object.hasOwn(webHostFiles, packageJSON.name)
        ? webHostFiles[packageJSON.name]
        : undefined;
      const templateFiles = getTemplateFiles(
        filesFilters,
        webHostFile,
        templateFileFilter,
      );
      const metadata = {
        name: packageJSON.repository?.directory || example,
        version: packageJSON.version,
        files: sortedFiles,
        previewImage: previewImage,
        templateFiles: templateFiles,
        exampleGitBaseUrl: packageJSON.exampleGitBaseUrl || gitBaseUrl,
      };
      const exampleNativeFramework = packageJSON.nativeFramework || framework;
      if (exampleNativeFramework) {
        metadata.nativeFramework = exampleNativeFramework;
      }

      // write example-metadata.json
      fs.writeFileSync(jsonFilePath, JSON.stringify(metadata, null, 2));
    },
  );
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
