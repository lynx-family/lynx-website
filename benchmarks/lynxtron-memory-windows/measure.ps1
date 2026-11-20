<#
.SYNOPSIS
  Sample idle memory for a Lynxtron or Electron hello-world app.

.DESCRIPTION
  Launches the given runtime with the given app directory, waits for the window to
  settle, then samples "Working Set - Private" (the value Task Manager shows in its
  Memory column) across every process whose executable lives under the runtime
  directory. Repeats N runs, kills the process tree between runs, and writes a CSV.

.EXAMPLE
  .\measure.ps1 -Label lynxtron -RuntimeDir C:\bench\lynxtron -ExeName lynxtron.exe `
                -AppDir C:\bench\lynxtron-hello -Runs 4 -Samples 3

.NOTES
  Run one runtime at a time on an otherwise idle machine. Close browsers and other
  heavy apps first; the numbers are only comparable under the same background load.
#>
param(
  [Parameter(Mandatory = $true)][string]$Label,
  [Parameter(Mandatory = $true)][string]$RuntimeDir,
  [Parameter(Mandatory = $true)][string]$ExeName,
  [Parameter(Mandatory = $true)][string]$AppDir,
  [int]$Runs = 4,
  [int]$Samples = 3,
  [int]$SettleSeconds = 6,
  [int]$SampleIntervalSeconds = 2,
  [string]$OutFile = ".\results-$Label.csv"
)

$ErrorActionPreference = 'Stop'
$RuntimeDir = (Resolve-Path $RuntimeDir).Path.TrimEnd('\')
$AppDir = (Resolve-Path $AppDir).Path
$exe = Join-Path $RuntimeDir $ExeName

if (-not (Test-Path $exe)) { throw "Runtime executable not found: $exe" }

function Get-RuntimeProcesses {
  Get-Process | Where-Object {
    try { $_.Path -and $_.Path.StartsWith($RuntimeDir, [StringComparison]::OrdinalIgnoreCase) }
    catch { $false }
  }
}

function Get-PrivateWorkingSetMB {
  param([int[]]$Ids)
  if (-not $Ids -or $Ids.Count -eq 0) { return @() }
  $perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
    Where-Object { $Ids -contains [int]$_.IDProcess }
  foreach ($p in $perf) {
    [pscustomobject]@{
      Id   = [int]$p.IDProcess
      Name = $p.Name
      MB   = [math]::Round([double]$p.WorkingSetPrivate / 1MB, 1)
    }
  }
}

function Stop-RuntimeProcesses {
  Get-RuntimeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}

$rows = @()

for ($run = 1; $run -le $Runs; $run++) {
  Stop-RuntimeProcesses
  Write-Host "== $Label run $run =="

  Start-Process -FilePath $exe -ArgumentList "`"$AppDir`"" -WorkingDirectory $RuntimeDir | Out-Null
  Start-Sleep -Seconds $SettleSeconds

  for ($s = 1; $s -le $Samples; $s++) {
    $procs = Get-RuntimeProcesses
    if (-not $procs) { throw "No $Label processes found under $RuntimeDir" }

    $detail = Get-PrivateWorkingSetMB -Ids $procs.Id
    $total = [math]::Round(($detail | Measure-Object -Property MB -Sum).Sum, 1)

    $rows += [pscustomobject]@{
      label   = $Label
      run     = $run
      sample  = $s
      procs   = $procs.Count
      totalMB = $total
      detail  = (($detail | ForEach-Object { "$($_.Name)=$($_.MB)MB" }) -join ' ')
    }
    Write-Host ("  sample {0}: procs={1} total={2} MB  [{3}]" -f $s, $procs.Count, $total, $rows[-1].detail)

    if ($s -lt $Samples) { Start-Sleep -Seconds $SampleIntervalSeconds }
  }
}

$rows | Export-Csv -Path $OutFile -NoTypeInformation -Encoding UTF8
Write-Host "Wrote $OutFile"

$summary = $rows | Group-Object run | ForEach-Object {
  $values = @($_.Group.totalMB | Sort-Object)
  [pscustomobject]@{
    run      = [int]$_.Name
    procs    = $_.Group[0].procs
    medianMB = $values[[int][math]::Floor($values.Count / 2)]
  }
}
$summary | Format-Table -AutoSize
