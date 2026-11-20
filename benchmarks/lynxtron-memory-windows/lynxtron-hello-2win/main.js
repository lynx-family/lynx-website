// Same window as lynxtron-hello, plus a second window that opens 12 s after launch
// so a sampler can compare one-window and two-window memory.
const { app, LynxWindow } = require('lynxtron');
const path = require('path');

function openWindow() {
  const win = new LynxWindow({
    width: 700,
    height: 520,
    x: 80,
    y: 80,
    title: 'hello-lynxtron',
  });
  win.show();
  win.loadFile(path.join(__dirname, 'main.lynx.bundle'));
}

app.whenReady().then(() => {
  openWindow();
  setTimeout(openWindow, 12000);
});
