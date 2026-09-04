const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const folderPath = 'docs/public/living-spec';
const sourcePath = 'packages/lynx-living-spec';
const htmlPath = path.join(folderPath, 'index.html');
const temporaryHtmlPath = path.join(folderPath, 'index.tmp.html');
const bikeshedVersion = '7.1.2';

function finalizeHtml(outputPath) {
  const htmlContent = fs
    .readFileSync(outputPath, 'utf8')
    .replace(/^[ \t]+$/gm, '');
  const script = `
    <script>
      window.addEventListener('hashchange', function() {
        window.parent.postMessage(JSON.stringify({
          src: 'living-spec',
          hash: window.location.hash,
        }), '*');
      });
    </script>`;
  fs.writeFileSync(outputPath, htmlContent + script, 'utf8');
}

fs.mkdirSync(folderPath, { recursive: true });
fs.rmSync(temporaryHtmlPath, { force: true });

// Use the exact Bikeshed release and its bundled data. Three --quiet flags
// suppress informational and lint output while retaining warnings, link errors,
// and fatal errors; unresolved links still fail after the full document is
// processed, so all actionable diagnostics are reported together.
const result = spawnSync(
  'pipx',
  [
    'run',
    '--spec',
    `bikeshed==${bikeshedVersion}`,
    'bikeshed',
    '--quiet',
    '--quiet',
    '--quiet',
    '--print',
    'plain',
    '--no-update',
    '--die-on',
    'link-error',
    '--die-when',
    'late',
    'spec',
    path.join(sourcePath, 'src/index.bs'),
    temporaryHtmlPath,
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  fs.rmSync(temporaryHtmlPath, { force: true });
  throw result.error;
}

if (result.status !== 0) {
  fs.rmSync(temporaryHtmlPath, { force: true });
  process.exit(result.status ?? 1);
}

finalizeHtml(temporaryHtmlPath);
fs.renameSync(temporaryHtmlPath, htmlPath);
console.log(`Generated ${htmlPath} with Bikeshed ${bikeshedVersion}`);
