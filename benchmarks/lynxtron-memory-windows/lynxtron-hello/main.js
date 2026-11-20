// Minimal Lynxtron app: one 700x520 window rendering a static Lynx bundle.
const { app, LynxWindow } = require('lynxtron');
const path = require('path');

app.whenReady().then(() => {
  const win = new LynxWindow({
    width: 700,
    height: 520,
    x: 80,
    y: 80,
    title: 'hello-lynxtron',
  });
  win.show();
  win.loadFile(path.join(__dirname, 'main.lynx.bundle'));
});
