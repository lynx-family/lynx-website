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

const isPackCopy = true;
const linkPath = path.join(currentDir, 'docs/public', 'lynx-examples');
const ignoreDirs = ['node_modules', '.git', '.turbo'];
const ignoreFiles = ['.DS_Store', 'LICENSE'];

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

  files.forEach((file) => {
    const fullPath = path.join(exampleDir, file);
    const targetPath = path.join(lnExampleDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const dirName = path.basename(fullPath);
      if (ignoreDirs.includes(dirName)) {
        return;
      }
      if (isPackCopy) {
        execSync(`cp -Lrfp "${fullPath}" "${targetPath}"`);
      } else {
        fs.symlinkSync(fullPath, targetPath);
      }
    } else {
      if (ignoreFiles.includes(file)) {
        return;
      }
      if (isPackCopy) {
        execSync(`cp -Lrfp "${fullPath}" "${targetPath}"`);
      } else {
        fs.symlinkSync(fullPath, targetPath);
      }
    }
  });
}

/**
 * Get all .lynx.bundle|.web.bundle files
 * @param {Array} allFiles - An array of all file paths
 * @returns {Array} - An array of template files
 */
function getTemplateFiles(allFiles) {
  const entries = [];
  allFiles.forEach((file) => {
    if (file.endsWith(lynxEntryFileName)) {
      const dir = file.split('/');
      const name = dir[dir.length - 1].replace(lynxEntryFileName, '');
      const entry = {
        name: name || dir[dir.length - 2],
        file: file,
      };
      const webFile = file.replace(lynxEntryFileName, webEntryFileName);
      if (allFiles.includes(webFile)) {
        entry.webFile = webFile;
      }
      entries.push(entry);
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

    // example-metadata.json
    const jsonFilePath = path.join(lnExampleDir, 'example-metadata.json');

    const previewImage = files.find((file) => previewImageReg.test(file));
    const templateFiles = getTemplateFiles(filesFilters);

    // write example-metadata.json
    fs.writeFileSync(
      jsonFilePath,
      JSON.stringify(
        {
          name: packageJSON.repository?.directory || example,
          files: sortedFiles,
          previewImage: previewImage,
          templateFiles: templateFiles,
          exampleGitBaseUrl,
        },
        null,
        2,
      ),
    );
  });
  console.log('lynx-examples link success');
}

/**
 * Main function to execute the script
 */
parseExampleData();
