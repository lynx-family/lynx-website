<#
.SYNOPSIS
  Measure the memory cost of one additional window.

.DESCRIPTION
  Launches a two-window probe app, samples "Working Set - Private" across every
  process whose executable lives under the runtime directory while only the first
  window is open, waits for the app to open its second window 12 s after launch,
  samples again, and reports the delta. Repeats N runs and writes a CSV.

.EXAMPLE
  .\measure-delta.ps1 -Label lynxtron -RuntimeDir C:\bench\lynxtron -ExeName lynxtron.exe `
                      -AppDir .\lynxtron-hello-2win -Runs 4
#>
param(
  [Parameter(Mandatory = $true)][string]$Label,
  [Parameter(Mandatory = $true)][string]$RuntimeDir,
  [Parameter(Mandatory = $true)][string]$ExeName,
  [Parameter(Mandatory = $true)][string]$AppDir,
  [int]$Runs = 4,
  [int]$Samples = 3,
  [int]$FirstWindowSettleSeconds = 6,
  [int]$SecondWindowSettleSeconds = 14,
  [int]$SampleIntervalSeconds = 2,
  [string]$OutFile = ".\delta-$Label.csv"
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
  Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
    Where-Object { $Ids -contains [int]$_.IDProcess } |
    ForEach-Object {
      [pscustomobject]@{ Id = [int]$_.IDProcess; MB = [math]::Round([double]$_.WorkingSetPrivate / 1MB, 1) }
    }
}

function Stop-RuntimeProcesses {
  Get-RuntimeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}

function Measure-Phase {
  param([string]$Phase)
  $procs = Get-RuntimeProcesses
  if (-not $procs) { throw "No $Label processes found under $RuntimeDir" }
  $detail = Get-PrivateWorkingSetMB -Ids $procs.Id
  $total = [math]::Round(($detail | Measure-Object -Property MB -Sum).Sum, 1)
  Write-Host ("  {0}: procs={1} total={2} MB" -f $Phase, $procs.Count, $total)
  [pscustomobject]@{ phase = $Phase; procs = $procs.Count; totalMB = $total }
}

$rows = @()

for ($run = 1; $run -le $Runs; $run++) {
  Stop-RuntimeProcesses
  Write-Host "== $Label run $run =="
  Start-Process -FilePath $exe -ArgumentList "`"$AppDir`"" -WorkingDirectory $RuntimeDir | Out-Null

  Start-Sleep -Seconds $FirstWindowSettleSeconds
  $one = @()
  for ($s = 1; $s -le $Samples; $s++) {
    $one += Measure-Phase -Phase "one-window s$s"
    if ($s -lt $Samples) { Start-Sleep -Seconds $SampleIntervalSeconds }
  }

  # The probe opens its second window 12 s after launch.
  Start-Sleep -Seconds $SecondWindowSettleSeconds
  $two = @()
  for ($s = 1; $s -le $Samples; $s++) {
    $two += Measure-Phase -Phase "two-window s$s"
    if ($s -lt $Samples) { Start-Sleep -Seconds $SampleIntervalSeconds }
  }

  $oneMedian = ($one.totalMB | Sort-Object)[[int][math]::Floor($one.Count / 2)]
  $twoMedian = ($two.totalMB | Sort-Object)[[int][math]::Floor($two.Count / 2)]
  $rows += [pscustomobject]@{
    label        = $Label
    run          = $run
    oneWindowMB  = $oneMedian
    oneProcs     = $one[-1].procs
    twoWindowMB  = $twoMedian
    twoProcs     = $two[-1].procs
    deltaMB      = [math]::Round($twoMedian - $oneMedian, 1)
  }
}

$rows | Export-Csv -Path $OutFile -NoTypeInformation -Encoding UTF8
Write-Host "Wrote $OutFile"
$rows | Format-Table -AutoSize

$deltas = @($rows.deltaMB | Sort-Object)
Write-Host ("median delta: {0} MB" -f $deltas[[int][math]::Floor($deltas.Count / 2)])
