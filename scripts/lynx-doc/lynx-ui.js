/**
 * Script: Lynx UI Documentation Integration
 *
 * This script is responsible for integrating documentation content from `node_modules/@lynx-js/lynx-ui-doc`
 * into the current website project.
 *
 * Key features include:
 * 1. Copy Documentation: Copies Chinese and English documentation from the `docs` directory to
 *    `docs/zh/lynx-ui` and `docs/en/lynx-ui` respectively.
 * 2. Copy Assets: Copies static assets (images, etc.) from the `public` directory to `docs/public`.
 * 3. Copy Shared Docs: Copies `sharedDocs` (e.g., API fragments) to the project root.
 * 4. Fix Links: Batches processing of Markdown files to fix internal links, redirecting paths like
 *    `/Components/` to `/lynx-ui/`.
 * 5. Source Mapping: Creates symlinks for `src/lynx-ui` and `theme/lynx-ui` pointing to the source code
 *    in `node_modules`, allowing build tools to correctly resolve components and themes.
 *
 * Usage: Typically triggered automatically via `npm run prepare:lynx-ui-doc`.
 */
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const rootPath = path.join(__dirname, '../../');

const lynxUiAction = async () => {
  const lynxUiPath = path.join(rootPath, 'node_modules/@lynx-js/lynx-ui-doc');
  const tmpPath = path.join(rootPath, 'tmp/lynx-ui');

  if (!fs.existsSync(lynxUiPath)) {
    throw new Error(`lynx-ui-doc is not exist：${lynxUiPath}`);
  }

  await fsp.rm(tmpPath, { recursive: true, force: true });
  await fsp.rm(path.join(rootPath, 'tmp'), { recursive: true, force: true });
  await fsp.cp(path.join(lynxUiPath, 'docs'), tmpPath, { recursive: true });

  await fsp.rm(path.join(tmpPath, 'en/_meta.json'), { force: true });
  await fsp.rm(path.join(tmpPath, 'zh/_meta.json'), { force: true });

  const targetPath = path.join(rootPath, 'docs');
  await fsp.rm(path.join(targetPath, 'en/lynx-ui'), {
    recursive: true,
    force: true,
  });
  await fsp.rm(path.join(targetPath, 'zh/lynx-ui'), {
    recursive: true,
    force: true,
  });

  await fsp.cp(path.join(tmpPath, 'en'), path.join(targetPath, 'en/lynx-ui'), {
    recursive: true,
  });
  await fsp.cp(path.join(tmpPath, 'zh'), path.join(targetPath, 'zh/lynx-ui'), {
    recursive: true,
  });

  const tmpPublicPath = path.join(tmpPath, 'public');
  if (fs.existsSync(tmpPublicPath)) {
    await fsp.cp(tmpPublicPath, path.join(targetPath, 'public'), {
      recursive: true,
      force: true,
    });
  }

  const lynxUiPublicPath = path.join(lynxUiPath, 'public');
  if (fs.existsSync(lynxUiPublicPath)) {
    await fsp.cp(lynxUiPublicPath, path.join(targetPath, 'public'), {
      recursive: true,
      force: true,
    });
  }

  const sharedDocsPath = path.join(rootPath, 'sharedDocs');
  await fsp.rm(sharedDocsPath, { recursive: true, force: true });
  await fsp.cp(path.join(lynxUiPath, 'sharedDocs'), sharedDocsPath, {
    recursive: true,
  });

  const replaceLinksInDir = async (dirPath) => {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await replaceLinksInDir(entryPath);
          return;
        }
        if (!entry.name.endsWith('.mdx')) {
          return;
        }
        const content = await fsp.readFile(entryPath, 'utf8');
        const updated = content
          .replace(
            /\]\(\/Components\/Components\//g,
            '](/lynx-ui/Components/Components/',
          )
          .replace(
            /\]\(\/api\/lynx-api\/gesture\/fundamentals\/installation\.html\)/g,
            '](/lynx-ui/Guides/Gesture.html)',
          )
          .replace(
            /\]\(\/api\/lynx-api\/gesture\/index\.html\)/g,
            '](/lynx-ui/Guides/Gesture.html)',
          )
          .replace(
            /\]\(\/api\/lynx-api\/main-thread\.html\)/g,
            '](/lynx-ui/Guides/MainThreadScript.html)',
          );
        if (updated !== content) {
          await fsp.writeFile(entryPath, updated);
        }
      }),
    );
  };

  await replaceLinksInDir(path.join(sharedDocsPath, 'packageDocs'));

  await fsp.rm(tmpPath, { recursive: true, force: true });
  await fsp.rm(path.join(rootPath, 'tmp'), { recursive: true, force: true });

  const lynxUiSrcPath = path.join(lynxUiPath, 'src/lynx-ui');
  const targetUiSrcPath = path.join(rootPath, 'src/lynx-ui');
  await fsp.rm(targetUiSrcPath, { recursive: true, force: true });
  await fsp.symlink(lynxUiSrcPath, targetUiSrcPath, 'dir');

  const lynxUiThemePath = path.join(lynxUiPath, 'theme');
  const targetUiThemePath = path.join(rootPath, 'theme/lynx-ui');
  await fsp.rm(targetUiThemePath, { recursive: true, force: true });
  await fsp.symlink(lynxUiThemePath, targetUiThemePath, 'dir');
};

lynxUiAction().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { lynxUiAction };
