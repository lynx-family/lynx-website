import { app, LynxWindow } from '@lynx-js/lynxtron';
import { nudgeFramedWindowViewport } from '@lynxtron-showcases/config/window';
import { LYNX_BUNDLE_PATH } from './vendorPaths';

declare const __non_webpack_require__: NodeRequire;

function registerNativeTextureCanvas() {
  try {
    const registered = __non_webpack_require__(
      'lynxtron-native-texture-canvas',
    ).setUp();
    if (!registered) {
      console.warn(
        '[native-texture-canvas] native texture canvas extension was not registered.',
      );
    }
  } catch (error) {
    console.warn(
      '[native-texture-canvas] failed to register native texture canvas extension:',
      error,
    );
  }
}

registerNativeTextureCanvas();

app.whenReady().then(() => {
  const win = new LynxWindow({
    width: 1120,
    height: 780,
    minWidth: 960,
    minHeight: 720,
    title: 'Native Texture Canvas',
  });

  win.show();
  win.loadFile(LYNX_BUNDLE_PATH);
  nudgeFramedWindowViewport(win);
});
