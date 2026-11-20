# Exercises pure statistics and counter-validation logic with CIM fixtures.
# Does not measure Windows memory or launch a runtime.
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'measure-delta.ps1'
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
$functions = $ast.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst]}, $false)
foreach ($function in $functions) { Invoke-Expression $function.Extent.Text }
if ((Get-Median @(1, 2, 8, 9)) -ne 5) { throw 'Even median regression' }
if ((Get-Median @(9, 1, 2)) -ne 2) { throw 'Odd median regression' }
$control = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $control | Out-Null
$rawFile = Join-Path $control 'samples.jsonl'
$launch = [pscustomobject]@{Id=100; HasExited=$false}
$clock = [Diagnostics.Stopwatch]::StartNew(); $run=1; $Label='fixture'
$script:processFixture = @(
 [pscustomobject]@{ProcessId=100;ParentProcessId=5;CreationDate='today';CommandLine='Electron.exe app';ExecutablePath='C:\electron\Electron.exe'},
 [pscustomobject]@{ProcessId=101;ParentProcessId=100;CreationDate='today';CommandLine='Electron.exe --type=renderer';ExecutablePath='C:\electron\Electron.exe'},
 [pscustomobject]@{ProcessId=102;ParentProcessId=100;CreationDate='today';CommandLine='Electron.exe --type=gpu-process';ExecutablePath='C:\electron\Electron.exe'},
 [pscustomobject]@{ProcessId=103;ParentProcessId=102;CreationDate='today';CommandLine='Electron.exe --type=utility';ExecutablePath='C:\electron\Electron.exe'},
 [pscustomobject]@{ProcessId=999;ParentProcessId=5;CreationDate='today';CommandLine='Other.exe';ExecutablePath='C:\Other.exe'}
)
$script:counterFixture = @(100..103 | ForEach-Object { [pscustomobject]@{IDProcess=$_;WorkingSetPrivate=1234567} })
function Get-CimInstance {
 param($ClassName)
 if ($ClassName -eq 'Win32_Process') {return $script:processFixture}
 if ($ClassName -eq 'Win32_PerfFormattedData_PerfProc_Process') {return $script:counterFixture}
 throw "Unexpected CIM class $ClassName"
}
'{"pid":100,"windows":1,"rendererPID":101}' | Set-Content (Join-Path $control 'ready-1.json')
$tree = @(Get-ProbeProcesses -LaunchId 100)
if ($tree.Count -ne 4 -or $tree.ProcessId -contains 999) {throw 'Process tree selection failed'}
Wait-Window 1 | Out-Null
$row = Measure-Phase 1 1
if ($row.totalBytes -ne 4938268 -or $row.processes -ne 4 -or $row.renderers -ne 1) {throw 'Complete sample failed'}
# A missing counter must fail, and must not append an understated raw sample.
$script:counterFixture = $script:counterFixture | Where-Object {$_.IDProcess -ne 103}
$failed=$false
try { Measure-Phase 1 2 | Out-Null } catch {
 if ($_ -notmatch 'Incomplete or changing process counters') {throw}
 $failed=$true
}
if (-not $failed) {throw 'Missing PID was accepted'}
if (@(Get-Content $rawFile).Count -ne 1) {throw 'Rejected sample was persisted'}
$script:counterFixture = @(100..103 | ForEach-Object { [pscustomobject]@{IDProcess=$_;WorkingSetPrivate=1234567} })
New-Item -ItemType File (Join-Path $control 'ready-2.json') | Out-Null
$failed=$false
try { Measure-Phase 1 3 | Out-Null } catch {
 if ($_ -notmatch 'Second window opened before baseline') {throw}
 $failed=$true
}
if (-not $failed) {throw 'Mixed phase was accepted'}
Remove-Item $control -Recurse -Force
'PASS: PowerShell parser, odd/even median, process tree, complete counters, missing-counter rejection and phase guard'
