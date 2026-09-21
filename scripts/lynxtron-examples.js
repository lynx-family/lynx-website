const path = require('node:path');
const { parseExampleData } = require('./lynx-example');

// Only reviewed Web hosts may opt into iframe previews. Match the full package
// name so unrelated examples with the same directory name cannot opt in.
const webHostFiles = {
  '@lynxtron-examples/cross-platform-notes': 'dist_precompiled/web/index.html',
};

parseExampleData({
  examplesDir: path.resolve(
    process.env.EXAMPLES_DIR ||
      'packages/lynxtron-example-packages/node_modules/@lynxtron-examples',
  ),
  removeLinkPath: false,
  exampleGitBaseUrl:
    'https://github.com/lynx-community/lynxtron-examples/tree/main',
  nativeFramework: 'lynxtron',
  webHostFiles,
});
