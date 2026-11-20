# Verify the system WebView example on Windows

The launch blog states that the `system-webview` example uses WKWebView on macOS and
WebView2 on Windows. The macOS path has been run; this task verifies the Windows path
actually builds and renders, so the claim holds.

The example lives in the npm package `@lynxtron-examples/system-webview@0.0.1`. In this
repository it is unpacked to `docs/public/lynx-examples/system-webview` by `pnpm install`.
It is not part of the pnpm workspace, so build and run it from its own directory.

## Prerequisites

- Windows 10/11 x64
- Node.js x64, 18 or newer
- Visual Studio 2022 with **Desktop development with C++** and a Windows SDK
- CMake 3.20 or newer
- [Evergreen WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

The first Windows build downloads the pinned WebView2 SDK from NuGet. Only the loader is
linked into the extension.

## Build and run

From the example directory:

```powershell
npm install --include=dev
npm run build:native-ui
npm start
```

`build:native-ui` runs `build-native.cjs` (CMake + the Visual C++ toolchain) and then `rspeedy build`.
`npm start` runs `lynxtron .`.

## What to verify

1. The Lynxtron window opens with the Lynx toolbar at the top.
2. The embedded WebView2 area renders the Lynxtron homepage (`https://lynxjs.org/lynxtron/index.html`).
3. **Expand WebView** widens the embedded page and **Narrow WebView** restores it.
4. Quick Start and Browse APIs inside the WebView navigate without crashing.
5. The native extension loads; no missing-element or registration errors in the console.
6. Resizing the window keeps the WebView aligned with the Lynx layout.

## What to report back

1. Whether the build succeeded, and the full output of `build:native-ui` if it failed.
2. A screenshot of the running window with the WebView2 content visible.
3. A screenshot after **Expand WebView**.
4. `cmake --version`, Visual C++ toolset version, Windows build number.
5. Installed WebView2 Runtime version.
6. Any console or crash output, and which file you changed if you had to adapt the build.

## Notes

- The WebView2 profile is stored in `%LOCALAPPDATA%\LynxtronSystemWebViewExample`.
- If CMake cannot find the WebView2 SDK, delete the NuGet cache directory created by
  `build-native.cjs` and rerun so the package is downloaded again.
- Do not modify `docs/` content other than the example directory itself, and do not
  commit to `main`.
