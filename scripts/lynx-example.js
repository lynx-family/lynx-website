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

const examplesDir = path.join(
  __dirname,
  './../packages/lynx-example-packages/node_modules/@lynx-example',
);

const linkPath = path.join(__dirname, './../docs/public', 'lynx-examples');

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
      if (file === 'node_modules') {
        return;
      }
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Get all .lynx.bundle|.web.bundle files
 * @param {Array} allFiles - An array of all file paths
 * @returns {Array} - An array of template files
 */
function getTemplateFiles(allFiles) {
  const entries = [];
  allFiles.forEach((file) => {
    if (file.endsWith('.lynx.bundle')) {
      const dir = file.split('/');
      const name = dir[dir.length - 1].replace('.lynx.bundle', '');
      const entry = {
        name: name,
        file: file,
      };
      const webFile = file.replace('.lynx.bundle', '.web.bundle');
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
  if (fs.existsSync(linkPath)) {
    fs.unlinkSync(linkPath);
  }
  fs.symlinkSync(examplesDir, linkPath);

  const examples = fs.readdirSync(linkPath);

  examples.forEach((example) => {
    const exampleDir = path.join(examplesDir, example);
    const packageJSON = JSON.parse(
      fs.readFileSync(path.join(exampleDir, 'package.json'), 'utf8'),
    );
    const allFiles = getAllFiles(exampleDir, []);

    const files = allFiles.map((file) => path.relative(exampleDir, file));

    // preview image
    const previewImageReg = /^preview-image\.(png|jpg|jpeg|webp|gif)$/;

    // These files will not be included in the final output
    const ignoreFiles = ['.DS_Store', 'LICENSE', 'example-metadata.json'];
    const filesFilters = files.filter(
      (file) => !ignoreFiles.includes(file) && !previewImageReg.test(file),
    );

    const sortedFiles = sortFilesByDirectoryFirst(filesFilters);

    // example-metadata.json
    const jsonFilePath = path.join(exampleDir, 'example-metadata.json');

    const previewImage = files.find((file) => previewImageReg.test(file));
    const templateFiles = getTemplateFiles(filesFilters);

    // write example-metadata.json
    fs.writeFileSync(
      jsonFilePath,
      JSON.stringify(
        {
          name: packageJSON.repository.directory || `examples/${example}`,
          files: sortedFiles,
          previewImage: previewImage,
          templateFiles: templateFiles,
        },
        null,
        2,
      ),
    );
  });
}

/**
 * Main function to execute the script
 */
parseExampleData();
