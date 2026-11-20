# Lynxtron vs Electron idle memory on Windows

Companion run to the macOS measurement used in the Lynxtron launch blog. The macOS
numbers were taken on an Apple M5 Max MacBook Pro with a 700×520 hello-world window:
Lynxtron 0.0.28 used about 52 MB of memory Footprint in one process, Electron 44.3.0
used 86 MB across four processes. This kit reproduces the same protocol on Windows.

## What is measured

- **Metric:** `Working Set - Private`, summed across every process whose executable
  lives under the runtime directory. This is the number Task Manager shows in its
  Memory column, and it is the closest Windows analogue to macOS Footprint.
- **Window:** one 700×520 window, static "Hello World" content, no animation,
  no network, no user interaction.
- **Protocol:** 4 runs per runtime × 3 samples per run, 6 s settle after launch,
  2 s between samples, process tree killed between runs.
- **Order:** run the two runtimes on the same machine, same session, one at a time.
  Do not run them concurrently, and close browsers and other heavy apps first.

## Layout

```
lynxtron-hello/   minimal Lynxtron app (main.js + main.lynx.bundle)
electron-hello/   minimal Electron app (main.js + index.html)
measure.ps1       launcher + sampler
```

Both apps open the same 700×520 window with the same static text, so the only
difference is the runtime.

## Prerequisites

- Windows 10/11 x64, PowerShell 7
- Node.js 18+ (only needed if you rebuild the Lynx bundle; the committed bundle runs as-is)
- The two runtimes, unpacked side by side, outside the repository:
  - Lynxtron 0.0.28: `lynx-family/lynxtron` release `v0.0.28`, Windows x64 archive
  - Electron 44.3.0: `electron/electron` release `v44.3.0`, `electron-v44.3.0-win32-x64.zip`

## Run

```powershell
# Lynxtron
.\measure.ps1 -Label lynxtron -RuntimeDir C:\bench\lynxtron -ExeName lynxtron.exe `
              -AppDir .\lynxtron-hello -Runs 4 -Samples 3

# Electron
.\measure.ps1 -Label electron -RuntimeDir C:\bench\electron -ExeName electron.exe `
              -AppDir .\electron-hello -Runs 4 -Samples 3
```

Each invocation writes `results-<label>.csv` and prints a per-run median.

## What to report back

1. `results-lynxtron.csv` and `results-electron.csv`
2. Median of the per-run medians, plus the process count, for each runtime
3. Windows build number, CPU model, total RAM
4. Runtime versions and, for Lynxtron, the archive name you downloaded

## Notes

- If `lynxtron.exe` does not accept an app directory as its first argument, run
  `lynxtron.exe --help` and adapt the `Start-Process` line in `measure.ps1`.
- `Get-Process` needs access to `Path`; run PowerShell as the same user that owns
  the processes, not from a restricted sandbox.
- If a run reports zero processes, the app crashed or the runtime directory filter
  does not match. Check that `lynxtron.exe` / `electron.exe` are directly inside
  `-RuntimeDir`.
