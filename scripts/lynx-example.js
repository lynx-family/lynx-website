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
 *     "src/rspeedy-env.d.ts",
 *     "lynx.config.ts",
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
const { execSync } = require('child_process');

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
// example-metadata.json (e.g. "lynxtron"). go-web reads this to pick the
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

// Complete Web hosts are executable documents rather than raw Lynx bundles.
// Keep this allowlist local so only reviewed, pinned examples can opt into the
// iframe path; package metadata alone must not expand the website trust boundary.
const exampleWebHostFiles = {
  'lynxtron-cross-platform-notes': 'dist/web/index.html',
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

function lnExampleFiles(exampleDir, lnExampleDir) {
  if (!fs.existsSync(lnExampleDir)) {
    fs.mkdirSync(lnExampleDir, { recursive: true });
  }

  const files = fs.readdirSync(exampleDir);
  const excludeArgs = ignoreDirs.map((d) => `--exclude '${d}'`).join(' ');
  const excludeFileArgs = ignoreFiles.map((f) => `--exclude '${f}'`).join(' ');

  files.forEach((file) => {
    const fullPath = path.join(exampleDir, file);
    const targetPath = path.join(lnExampleDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const dirName = path.basename(fullPath);
      if (ignoreDirs.includes(dirName)) {
        return;
      }
      if (isPackCopy) {
        // Use rsync to exclude nested node_modules/.git/.turbo and ignored files.
        // cp -Lrfp would copy everything including deep node_modules (e.g.
        // dist/desktop/node_modules/sqlite3), bloating the public deploy.
        execSync(
          `rsync -aL ${excludeArgs} ${excludeFileArgs} "${fullPath}/" "${targetPath}/"`,
        );
      } else {
        fs.symlinkSync(fullPath, targetPath);
      }
    } else {
      if (ignoreFiles.includes(file)) {
        return;
      }
      if (isPackCopy) {
        execSync(`cp -Lfp "${fullPath}" "${targetPath}"`);
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
 * @returns {Array} - An array of template files
 */
function getTemplateFiles(allFiles, webHostFile) {
  const entries = [];
  allFiles.forEach((file) => {
    if (file.endsWith(lynxEntryFileName)) {
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

  // Deduplicate names: when multiple bundles share the same basename
  // (e.g. dist/desktop/main.lynx.bundle and output/bundle/lynx/main.lynx.bundle),
  // prefix each with its parent directory to guarantee unique keys.
  const nameCounts = {};
  entries.forEach((e) => {
    nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
  });
  entries.forEach((e) => {
    if (nameCounts[e.name] > 1) {
      const parts = e.file.split('/');
      const parentDir = parts.length > 1 ? parts[parts.length - 2] : '';
      if (parentDir) {
        e.name = `${parentDir}/${e.name}`;
      }
    }
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
 * Parse example data and generate corresponding JSON files
 */
function parseExampleData() {
  if (removeLinkPath && fs.existsSync(linkPath)) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
  fs.mkdirSync(linkPath, { recursive: true });

  const examples = fs.readdirSync(examplesDir);

  examples.forEach((example) => {
    const exampleDir = path.join(examplesDir, example);
    const lnExampleDir = path.join(linkPath, example);
    // check exampleDir is a directory
    const stats = fs.statSync(exampleDir);
    if (!stats.isDirectory()) {
      console.warn('exampleDir is not a directory', exampleDir);
      return;
    }
    // check package.json exists
    const packageJSONPath = path.join(exampleDir, 'package.json');
    if (!fs.existsSync(packageJSONPath)) {
      console.warn('package.json not found', packageJSONPath);
      return;
    }
    const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
    // ln example files
    lnExampleFiles(exampleDir, lnExampleDir);
    applyExampleFixups(example, lnExampleDir);
    // get all files
    const allFiles = getAllFiles(exampleDir, []);

    const files = allFiles.map((file) => path.relative(exampleDir, file));

    // preview image
    const previewImageReg = /^preview-image\.(png|jpg|jpeg|webp|gif)$/;

    // These files will not be included in the final output
    const filesFilters = files.filter(
      (file) => !previewImageReg.test(file) && file !== 'example-metadata.json',
    );

    const sortedFiles = sortFilesByDirectoryFirst(filesFilters);

    // write example-metadata.json
    const jsonFilePath = path.join(lnExampleDir, 'example-metadata.json');

    const previewImage = files.find((file) => previewImageReg.test(file));
    const webHostFile = exampleWebHostFiles[example];
    const templateFiles = getTemplateFiles(filesFilters, webHostFile);

    const metadata = {
      name: packageJSON.repository?.directory || example,
      version: packageJSON.version,
      files: sortedFiles,
      previewImage: previewImage,
      templateFiles: templateFiles,
      exampleGitBaseUrl: packageJSON.exampleGitBaseUrl || exampleGitBaseUrl,
    };
    const exampleNativeFramework =
      packageJSON.nativeFramework || nativeFramework;
    if (exampleNativeFramework) {
      metadata.nativeFramework = exampleNativeFramework;
    }

    // write example-metadata.json
    fs.writeFileSync(jsonFilePath, JSON.stringify(metadata, null, 2));
  });
  console.log('lynx-examples link success');
}

/**
 * Main function to execute the script
 */
parseExampleData();
