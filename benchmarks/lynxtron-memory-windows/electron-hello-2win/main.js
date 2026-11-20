const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { runProbe } = require('../delta-probe.cjs');

runProbe({
  app,
  createWindow: (options) => new BrowserWindow(options),
  async loadWindow(win) {
    await win.loadFile(path.join(__dirname, 'index.html'));
    const text = await win.webContents.executeJavaScript(
      'document.body.innerText',
    );
    if (text.trim() !== 'Hello World')
      throw new Error('Unexpected page content');
    return {
      rendererPID: win.webContents.getOSProcessId(),
      url: win.webContents.getURL(),
      text,
    };
  },
});
