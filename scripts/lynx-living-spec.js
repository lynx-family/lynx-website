const fs = require('fs');
const { exec } = require('child_process');

const folderPath = 'docs/public/living-spec';
const sourcePath = 'packages/lynx-living-spec';
const shellCommand = `pipx run bikeshed spec ${sourcePath}/src/index.bs ${folderPath}/index.html`;

function addScriptToHtml(htmlPath) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  const script = `
    <script>
      window.addEventListener('hashchange', function() {
        window.parent.postMessage(JSON.stringify({
          src: 'living-spec',
          hash: window.location.hash,
        }), '*');
      });
    </script>`;
  fs.writeFileSync(htmlPath, htmlContent + script);
}

fs.rmdir(folderPath, { recursive: true }, (err) => {
  if (err) {
    console.error('Error deleting folder:', err);
    return;
  }
  fs.mkdir(folderPath, (err) => {
    if (err) {
      console.error('Error creating folder:', err);
      return;
    }
    exec(shellCommand, null, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing shell command: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log('All operations completed successfully');

      addScriptToHtml(`${folderPath}/index.html`);
    });
  });
});
