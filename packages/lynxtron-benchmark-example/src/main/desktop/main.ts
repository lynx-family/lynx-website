import { app, LynxWindow } from '@lynx-js/lynxtron';
import { nudgeFramedWindowViewport } from '@lynxtron-showcases/config/window';
import { LYNX_BUNDLE_PATH } from './vendorPaths';
import path from 'path';
import {
  getMemoryUsageDelta,
  getMemoryUsageSnapshot,
  type MemoryUsageDelta,
} from './memory-metrics';

const WINDOW_SETTLE_MS = 800;

let mainWindow: LynxWindow | null = null;
let secondWindow: LynxWindow | null = null;
let secondWindowDelta: MemoryUsageDelta | null = null;

function createBenchmarkWindow(title: string, width: number, height: number) {
  const w = new LynxWindow({
    width,
    height,
    title,
    lynxPreference: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  nudgeFramedWindowViewport(w);
  return w;
}

function attachWindowBridge(w: LynxWindow) {
  w.on('-lynx-invoke', async (callback, name) => {
    if (name === 'openSecondWindowAndMeasure') {
      if (secondWindow) {
        secondWindow.show();
        callback.sendReply({
          ok: true,
          delta: secondWindowDelta,
          alreadyOpen: true,
        });
        return;
      }

      const before = getMemoryUsageSnapshot();
      secondWindow = createBenchmarkWindow('Benchmark Dashboard #2', 640, 460);
      attachWindowBridge(secondWindow);
      secondWindow.on('closed', () => {
        secondWindow = null;
        secondWindowDelta = null;
      });
      secondWindow.show();
      secondWindow.loadFile(LYNX_BUNDLE_PATH);

      setTimeout(() => {
        const after = getMemoryUsageSnapshot();
        secondWindowDelta = getMemoryUsageDelta(before, after);
        callback.sendReply({
          ok: true,
          delta: secondWindowDelta,
          alreadyOpen: false,
        });
      }, WINDOW_SETTLE_MS);
      return;
    }

    if (name === 'getSecondWindowDelta') {
      callback.sendReply({
        isOpen: secondWindow != null,
        delta: secondWindowDelta,
      });
    }
  });
}

app.whenReady().then(() => {
  mainWindow = createBenchmarkWindow('Benchmark Dashboard', 700, 520);
  attachWindowBridge(mainWindow);
  mainWindow.show();
  mainWindow.loadFile(LYNX_BUNDLE_PATH);
});
