<#
.SYNOPSIS
  Measure one additional 700x520 window using explicit phase control.
.DESCRIPTION
  PowerShell 7 on Windows. Waits for each window to load, settles for 6 seconds,
  and samples Working Set - Private for the launched process tree. The second
  window opens only after all first-window samples have completed.
#>
param(
  [Parameter(Mandatory = $true)][string]$Label,
  [Parameter(Mandatory = $true)][string]$RuntimeDir,
  [Parameter(Mandatory = $true)][string]$ExeName,
  [Parameter(Mandatory = $true)][string]$AppDir,
  [ValidateRange(1, 100)][int]$Runs = 3,
  [ValidateRange(1, 100)][int]$Samples = 3,
  [ValidateRange(0, 600)][int]$FirstWindowSettleSeconds = 6,
  [ValidateRange(0, 600)][int]$SecondWindowSettleSeconds = 6,
  [ValidateRange(0, 600)][int]$SampleIntervalSeconds = 2,
  [string]$OutFile = ".\delta-$Label.csv"
)
$ErrorActionPreference = 'Stop'
$RuntimeDir = (Resolve-Path $RuntimeDir).Path.TrimEnd('\')
$AppDir = (Resolve-Path $AppDir).Path
$exe = Join-Path $RuntimeDir $ExeName
if (-not (Test-Path $exe)) { throw "Runtime executable not found: $exe" }
$OutFile = [IO.Path]::GetFullPath($OutFile)
# A unique directory retains readiness events, errors and every raw sample.
$artifactDir = "$OutFile.artifacts-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
$rawFile = Join-Path $artifactDir 'samples.jsonl'
Write-Host "Raw samples and phase events: $artifactDir"

function Get-Median {
  param([double[]]$Values)
  if (-not $Values.Count) { throw 'Cannot take the median of an empty sample' }
  $sorted = @($Values | Sort-Object)
  $middle = [int][math]::Floor($sorted.Count / 2)
  if ($sorted.Count % 2) { return $sorted[$middle] }
  return ($sorted[$middle - 1] + $sorted[$middle]) / 2
}

function Get-ProbeProcesses {
  param([int]$LaunchId)
  $all = @(Get-CimInstance Win32_Process)
  if (-not ($all | Where-Object { $_.ProcessId -eq $LaunchId })) {
    throw "Probe process $LaunchId exited"
  }
  $ids = [Collections.Generic.HashSet[int]]::new()
  [void]$ids.Add($LaunchId)
  do {
    $changed = $false
    foreach ($process in $all) {
      if ($ids.Contains([int]$process.ParentProcessId)) {
        if ($ids.Add([int]$process.ProcessId)) { $changed = $true }
      }
    }
  } while ($changed)
  $all | Where-Object { $ids.Contains([int]$_.ProcessId) }
}

function Assert-ProbeAlive {
  if (Test-Path (Join-Path $control 'error.txt')) {
    throw (Get-Content (Join-Path $control 'error.txt') -Raw)
  }
  if ($launch.HasExited) { throw "Probe exited with code $($launch.ExitCode)" }
}

function Wait-Window {
  param([int]$Count)
  $deadline = [datetime]::UtcNow.AddSeconds(30)
  $readyPath = Join-Path $control "ready-$Count.json"
  while (-not (Test-Path $readyPath)) {
    Assert-ProbeAlive
    if ([datetime]::UtcNow -gt $deadline) { throw "Timed out loading window $Count" }
    Start-Sleep -Milliseconds 100
  }
  Assert-ProbeAlive
  $ready = Get-Content $readyPath -Raw | ConvertFrom-Json
  if ($ready.pid -ne $launch.Id -or $ready.windows -ne $Count) {
    throw "Invalid window readiness event: $readyPath"
  }
  return $ready
}

function Measure-Phase {
  param([int]$WindowCount, [int]$Sample)
  # CIM's process list and performance counters are separate snapshots. Reject
  # missing/changed PID sets instead of treating an absent counter as zero.
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    Assert-ProbeAlive
    $startSeconds = $clock.Elapsed.TotalSeconds
    $before = @(Get-ProbeProcesses -LaunchId $launch.Id)
    $counters = @(Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
      Where-Object { $before.ProcessId -contains $_.IDProcess })
    $after = @(Get-ProbeProcesses -LaunchId $launch.Id)
    Assert-ProbeAlive
    $beforeKeys = @($before | ForEach-Object { "$($_.ProcessId):$($_.CreationDate)" } | Sort-Object)
    $afterKeys = @($after | ForEach-Object { "$($_.ProcessId):$($_.CreationDate)" } | Sort-Object)
    $counterIds = @($counters.IDProcess | Sort-Object -Unique)
    if (($beforeKeys -join ',') -eq ($afterKeys -join ',') -and
        $counterIds.Count -eq $before.Count -and $counters.Count -eq $before.Count -and
        @($counters | Where-Object { $null -eq $_.WorkingSetPrivate }).Count -eq 0) { break }
    if ($attempt -eq 3) { throw 'Incomplete or changing process counters after 3 attempts' }
    Start-Sleep -Milliseconds 500
  }
  if ($WindowCount -eq 1 -and (Test-Path (Join-Path $control 'ready-2.json'))) {
    throw 'Second window opened before baseline sampling completed'
  }
  $detail = @($before | ForEach-Object {
    $process = $_
    if (-not $process.CommandLine) { throw "Cannot read command line for PID $($process.ProcessId)" }
    $counter = $counters | Where-Object { $_.IDProcess -eq $process.ProcessId }
    $role = 'main'
    if ($process.CommandLine -match '--type=([^\s]+)') { $role = $Matches[1] }
    elseif ($process.ProcessId -ne $launch.Id) { $role = 'helper' }
    [pscustomobject]@{
      pid = [int]$process.ProcessId
      parentPid = [int]$process.ParentProcessId
      role = $role
      executable = $process.ExecutablePath
      workingSetPrivateBytes = [long]$counter.WorkingSetPrivate
    }
  })
  $rendererCount = @($detail | Where-Object { $_.role -eq 'renderer' }).Count
  # Electron's readiness event also records the actual renderer PID.
  $ready = Get-Content (Join-Path $control "ready-$WindowCount.json") -Raw | ConvertFrom-Json
  if ($ready.rendererPID) {
    $expected = @(1..$WindowCount | ForEach-Object {
      (Get-Content (Join-Path $control "ready-$_.json") -Raw | ConvertFrom-Json).rendererPID
    } | Sort-Object -Unique)
    $actual = @($detail | Where-Object { $_.role -eq 'renderer' } | ForEach-Object { $_.pid } | Sort-Object -Unique)
    if ($rendererCount -ne $WindowCount -or ($expected -join ',') -ne ($actual -join ',')) {
      throw 'Renderer PIDs do not match the loaded windows; inspect raw phase events'
    }
  }
  $total = [long](($detail | Measure-Object workingSetPrivateBytes -Sum).Sum)
  $row = [pscustomobject]@{
    label = $Label; run = $run; windows = $WindowCount; sample = $Sample
    startSeconds = $startSeconds; endSeconds = $clock.Elapsed.TotalSeconds
    processes = $detail.Count; renderers = $rendererCount
    totalBytes = $total; detail = $detail
  }
  $row | ConvertTo-Json -Depth 6 -Compress | Add-Content -Path $rawFile -Encoding utf8
  Write-Host ("  windows={0} sample={1} processes={2} renderers={3} total={4:N2} MiB" -f
    $WindowCount, $Sample, $detail.Count, $rendererCount, ($total / 1MB))
  return $row
}

$rows = @()
for ($run = 1; $run -le $Runs; $run++) {
  $control = Join-Path $artifactDir "run-$run"
  New-Item -ItemType Directory -Path $control | Out-Null
  # Refuse an already-running copy, rather than killing unrelated sessions.
  $existing = @(Get-CimInstance Win32_Process | Where-Object {
    $_.ExecutablePath -and $_.ExecutablePath.StartsWith("$RuntimeDir\", [StringComparison]::OrdinalIgnoreCase)
  })
  if ($existing.Count) { throw 'Close existing apps from this runtime directory before measuring' }
  $info = [Diagnostics.ProcessStartInfo]::new($exe)
  $info.UseShellExecute = $false
  $info.WorkingDirectory = $AppDir
  $info.ArgumentList.Add($AppDir)
  $info.Environment['BENCH_CONTROL_DIR'] = $control
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $launch = [Diagnostics.Process]::Start($info)
  try {
    Write-Host "== $Label run $run =="
    $one = @(); $two = @()
    Wait-Window -Count 1 | Out-Null
    Start-Sleep -Seconds $FirstWindowSettleSeconds
    for ($s = 1; $s -le $Samples; $s++) {
      $one += Measure-Phase -WindowCount 1 -Sample $s
      if ($s -lt $Samples) { Start-Sleep -Seconds $SampleIntervalSeconds }
    }
    New-Item -ItemType File -Path (Join-Path $control 'open-second') | Out-Null
    Wait-Window -Count 2 | Out-Null
    Start-Sleep -Seconds $SecondWindowSettleSeconds
    for ($s = 1; $s -le $Samples; $s++) {
      $two += Measure-Phase -WindowCount 2 -Sample $s
      if ($s -lt $Samples) { Start-Sleep -Seconds $SampleIntervalSeconds }
    }
    $oneMedian = Get-Median $one.totalBytes
    $twoMedian = Get-Median $two.totalBytes
    $rows += [pscustomobject]@{
      label = $Label; run = $run
      oneWindowMiB = $oneMedian / 1MB; oneProcs = $one[-1].processes
      twoWindowMiB = $twoMedian / 1MB; twoProcs = $two[-1].processes
      oneRenderers = $one[-1].renderers; twoRenderers = $two[-1].renderers
      deltaMiB = ($twoMedian - $oneMedian) / 1MB
    }
    $rows | Export-Csv -Path $OutFile -NoTypeInformation -Encoding UTF8
  }
  finally {
    if (-not $launch.HasExited) {
      # Windows taskkill /T includes descendants; target only this launch.
      & taskkill.exe /PID $launch.Id /T /F | Out-Null
      if ($LASTEXITCODE -ne 0) { Write-Warning 'Process cleanup failed; inspect runtime processes before retrying' }
      $launch.WaitForExit(5000) | Out-Null
    }
    $launch.Dispose()
    Start-Sleep -Seconds 2
  }
}
$rows | Format-Table -AutoSize
Write-Host ("Median paired delta: {0:N2} MiB" -f (Get-Median $rows.deltaMiB))
Write-Host "Summary: $OutFile"
Write-Host "Raw samples and phase events: $artifactDir"
