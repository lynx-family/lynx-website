# Lynxtron vs Electron idle memory on Windows

Companion run to the macOS measurement used in the Lynxtron launch blog. The macOS
numbers were taken on an Apple M5 Max MacBook Pro with a 700×520 hello-world window:
Lynxtron 0.0.28 used about 52 MB of memory Footprint in one process, Electron 44.3.0
used 86 MB across four processes. This kit reproduces the same protocol on Windows.

## What is measured

- **Metric:** `Working Set - Private`, summed across every process whose executable
  lives under the runtime directory. This is the number Task Manager shows in its
  Memory column. macOS uses Footprint; the metrics have different accounting.
- **Window:** one 700×520 window, static "Hello World" content, no animation,
  no network, no user interaction.
- **Protocol:** 4 runs per runtime × 3 samples per run, 6 s settle after launch,
  2 s between samples, process tree killed between runs.
- **Order:** run the two runtimes on the same machine, same session, one at a time.
  Do not run them concurrently, and close browsers and other heavy apps first.

## Layout

```
lynxtron-hello/        minimal Lynxtron app (main.js + main.lynx.bundle)
electron-hello/        minimal Electron app (main.js + index.html)
lynxtron-hello-2win/   same app, second window controlled by the sampler
electron-hello-2win/   same app, second window controlled by the sampler
measure.ps1            launcher + sampler, one window
measure-delta.ps1      launcher + sampler, one window then two windows
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

## Additional-window measurement (updated protocol)

Use `measure-delta.ps1` with the `*-hello-2win` probes. The old fixed 12-second
window timer could open the second window before baseline sampling finished;
results from that protocol must not be used for the delta comparison.

The updated protocol matches the macOS diagnostic measurement:

1. Open a 700×520 window with static Hello World content and wait for load
   confirmation (`ready-to-show` for Lynxtron; `loadFile` completion and a text
   check for Electron).
2. Wait 6 seconds, take 3 samples, with 2 seconds after each completed sample.
3. Only after all baseline samples finish, signal the app to open the second
   700×520 window. Keep both windows visible, without overlap. The default
   positions are (80, 80) and (820, 80); use a display with at least 1520×600
   logical pixels available. Keep display scaling unchanged between runtimes.
4. Wait for the second window to load, then settle for 6 seconds and take
   another 3 samples with the same interval.
5. Subtract each run's one-window median from its two-window median. Report
   the median of those paired differences, rather than subtracting pooled data.

The script saves unrounded Working Set - Private bytes for every process in the
launched process tree, PID, role, window count and actual sampling times. Missing
counters or changing PID sets are retried up to 3 times, then fail the run. The
Electron probes use default BrowserWindow settings and load the same file URL;
the sampler verifies that the loaded windows have distinct renderer PIDs.
Lynxtron should remain at one process. Do not add renderer-sharing flags.

Use **3 runs × 3 samples per phase** to match the macOS measurement. To also match
its alternating runtime order, run the following from this directory. Adjust only
the two runtime paths:

```powershell
$lynxRuntime = 'C:\bench\lynxtron'
$electronRuntime = 'C:\bench\electron'
foreach ($round in 1..3) {
  $order = if ($round % 2) { @('electron', 'lynxtron') } else { @('lynxtron', 'electron') }
  foreach ($runtime in $order) {
    if ($runtime -eq 'lynxtron') {
      .\measure-delta.ps1 -Label lynxtron -RuntimeDir $lynxRuntime -ExeName lynxtron.exe `
        -AppDir .\lynxtron-hello-2win -Runs 1 -OutFile ".\delta-lynxtron-$round.csv"
    } else {
      .\measure-delta.ps1 -Label electron -RuntimeDir $electronRuntime -ExeName electron.exe `
        -AppDir .\electron-hello-2win -Runs 1 -OutFile ".\delta-electron-$round.csv"
    }
  }
}

foreach ($runtime in @('lynxtron', 'electron')) {
  $rows = @(1..3 | ForEach-Object { Import-Csv ".\delta-$runtime-$_.csv" })
  $deltas = @($rows | ForEach-Object { [double]::Parse($_.deltaMiB, [cultureinfo]::InvariantCulture) } | Sort-Object)
  $rows | Format-Table
  "${runtime}: median paired delta = $($deltas[1]) MiB"
}
```

Return all six summary CSVs and their `.artifacts-*` directories, plus runtime
versions, Windows build, CPU, display resolution/scaling and confirmation that
both windows showed Hello World. Each artifact directory contains readiness
JSONs (including Electron renderer PIDs) and `samples.jsonl`. Report unexpected
process counts or blank windows; do not silently discard the run. Keep the
machine plugged in and avoid other interaction during sampling.

The Windows sampler must be run on Windows: macOS validation of the same probe
apps does not validate Windows performance counters. Four rounds are also
supported, but report that protocol difference; even-count medians use the
average of the two middle values.

### macOS reference

`macos-delta-reference.csv` records the three runs used for the blog's additional
window figures: Lynxtron 0.0.28 added approximately 10 MiB in each run; Electron
44.3.0 added approximately 24, 28 and 24 MiB. The median paired deltas are therefore
about 10 MiB and 24 MiB. The machine was an Apple M5 Max MacBook Pro. Both windows
were visible side by side, using the phase-controlled protocol above and the sum
of macOS `top` MEM (physical memory footprint). `top` rounds individual values,
so these results should be quoted approximately. These are macOS reference
values, not expected Windows thresholds.

Run `pwsh -NoProfile -File ./test-delta-sampler.ps1` to check odd/even medians,
process-tree selection, complete counters, missing-counter rejection and phase
guards using CIM fixtures. This can run on macOS as well as Windows; it does not
replace a real Windows measurement.
