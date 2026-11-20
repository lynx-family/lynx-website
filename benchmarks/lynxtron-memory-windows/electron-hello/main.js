// Minimal Electron app: one 700x520 window rendering a static HTML page.
const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 700,
    height: 520,
    x: 80,
    y: 80,
    show: true,
  });
  win.loadFile('index.html');
});
