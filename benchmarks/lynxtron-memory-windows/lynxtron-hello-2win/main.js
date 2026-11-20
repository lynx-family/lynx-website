const { app, LynxWindow } = require('lynxtron');
const path = require('node:path');
const { runProbe } = require('../delta-probe.cjs');

runProbe({
  app,
  createWindow: (options) => new LynxWindow(options),
  async loadWindow(win) {
    const ready = new Promise((resolve, reject) => {
      win.once('ready-to-show', resolve);
      win.once('--lynx-error', reject);
    });
    win.show();
    if (!win.loadFile(path.join(__dirname, 'main.lynx.bundle'))) {
      throw new Error('loadFile rejected the bundle');
    }
    await ready;
    return { loaded: true };
  },
});
