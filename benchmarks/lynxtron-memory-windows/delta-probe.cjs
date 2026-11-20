// The sampler, not a timer, controls the transition to two windows.
const fs = require('node:fs');
const path = require('node:path');

exports.runProbe = function runProbe({ app, createWindow, loadWindow }) {
  const control = process.env.BENCH_CONTROL_DIR;
  if (!control) throw new Error('Run this probe with measure-delta.ps1');
  const windows = [];
  function fail(error) {
    fs.writeFileSync(
      path.join(control, 'error.txt'),
      String(error?.stack || error),
    );
    app.exit(1);
  }
  async function openWindow() {
    const index = windows.length + 1;
    const win = createWindow({
      width: 700,
      height: 520,
      x: 80 + (index - 1) * 740,
      y: 80,
      show: true,
      title: `Hello World ${index}`,
    });
    windows.push(win);
    win.on('closed', () => fail(new Error('Window closed during measurement')));
    const detail = await loadWindow(win);
    const ready = path.join(control, `ready-${index}.json`);
    fs.writeFileSync(
      `${ready}.tmp`,
      JSON.stringify({
        windows: index,
        pid: process.pid,
        ...detail,
      }),
    );
    fs.renameSync(`${ready}.tmp`, ready);
  }
  app
    .whenReady()
    .then(async () => {
      await openWindow();
      const timer = setInterval(() => {
        if (fs.existsSync(path.join(control, 'open-second'))) {
          clearInterval(timer);
          openWindow().catch(fail);
        }
      }, 100);
    })
    .catch(fail);
};
