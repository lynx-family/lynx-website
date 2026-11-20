// Same window as electron-hello, plus a second window that opens 12 s after launch
// so a sampler can compare one-window and two-window memory.
const { app, BrowserWindow } = require('electron');

function openWindow() {
  const win = new BrowserWindow({
    width: 700,
    height: 520,
    x: 80,
    y: 80,
    show: true,
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  openWindow();
  setTimeout(openWindow, 12000);
});
