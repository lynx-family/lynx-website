import { app, LynxWindow } from '@lynx-js/lynxtron';
import { nudgeFramedWindowViewport } from '@lynxtron-showcases/config/window';
import path from 'path';
import { DESKTOP_BUNDLE_PATH } from './vendorPaths';

function createDesktopWindow(): LynxWindow {
  return new LynxWindow({
    width: 1120,
    height: 780,
    title: 'Cross-Platform Notes',
    lynxPreference: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
}

function bootstrapDesktopHost(): void {
  app.whenReady().then(() => {
    const window = createDesktopWindow();
    window.show();
    window.loadFile(DESKTOP_BUNDLE_PATH);
    nudgeFramedWindowViewport(window);
  });
}

bootstrapDesktopHost();
