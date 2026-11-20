# Open the system WebView showcase in Lynxtron Go on Windows

The launch blog states that the `system-webview` example uses WKWebView on macOS and
WebView2 on Windows. The macOS path has been run; this task checks the Windows path by
opening the showcase in Lynxtron Go, so the claim holds without building from source.

## Steps

1. Install Lynxtron Go for Windows x64:
   <https://github.com/lynx-community/lynxtron-examples/releases/latest/download/LynxtronGo-win-x64-Setup.exe>

   Windows 10/11 already ships the Evergreen WebView2 Runtime. If the embedded area stays
   blank, install it from <https://developer.microsoft.com/en-us/microsoft-edge/webview2/>
   and reopen the showcase.

2. Open the showcase, either way:
   - **In the app:** open the `…` menu in the upper-right corner → **New Project** →
     **Start from a showcase** → select **system-webview** → **Run**.
   - **From the docs page:** open the system WebView section of the Lynxtron blog and use
     **Open in Lynxtron Go**. The link is
     `lynxtron-go://showcase/open?id=@lynxtron-examples/system-webview`.

3. Wait for the window to appear and the embedded page to finish loading.

## What to verify

1. The window opens with the Lynx toolbar at the top.
2. The embedded area renders the Lynxtron homepage (`https://lynxjs.org/lynxtron/index.html`)
   through WebView2 — not a blank panel and not an error page.
3. **Expand WebView** widens the embedded page; **Narrow WebView** restores the initial width.
4. Quick Start and Browse APIs inside the WebView navigate without crashing.
5. Resizing the window keeps the WebView aligned with the Lynx layout.
6. No console or crash dialog appears.

## What to report back

1. Whether the showcase opened and rendered.
2. A screenshot of the running window with the WebView2 content visible.
3. A screenshot after **Expand WebView**.
4. Windows build number and Lynxtron Go version (from the About panel).
5. Installed WebView2 Runtime version, if you can find it.
6. Any error text or blank-panel behavior, and whether installing the WebView2 Runtime
   changed the result.

## Notes

- The WebView2 profile is stored in `%LOCALAPPDATA%\LynxtronSystemWebViewExample`.
- If the deeplink does nothing, confirm Lynxtron Go is registered as the handler for
  `lynxtron-go://` and fall back to the in-app showcase gallery.
- Do not modify `docs/` content and do not commit to `main`.
