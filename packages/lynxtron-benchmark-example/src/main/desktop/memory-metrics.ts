import { execFileSync } from 'child_process';
import os from 'os';

export interface MemoryUsageSnapshot {
  primary: number;
  secondary: number;
  primaryLabel: string;
  secondaryLabel: string;
  heapUsed: number;
  heapTotal: number;
}

export interface MemoryUsageDelta {
  primary: number;
  secondary: number;
  primaryLabel: string;
  secondaryLabel: string;
}

function parseTopMemValueToBytes(value: string): number {
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)([BKMGTP])?$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2] ?? 'B';
  const unitMap: Record<string, number> = {
    B: 1,
    K: 1024,
    M: 1024 * 1024,
    G: 1024 * 1024 * 1024,
    T: 1024 * 1024 * 1024 * 1024,
    P: 1024 * 1024 * 1024 * 1024 * 1024,
  };
  return Math.round(amount * (unitMap[unit] ?? 1));
}

function getActivityMonitorMemory(): number {
  if (os.platform() !== 'darwin') return 0;

  try {
    const output = execFileSync(
      '/usr/bin/top',
      ['-l', '1', '-pid', String(process.pid), '-stats', 'pid,mem'],
      { encoding: 'utf8' },
    );
    const row = output
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith(`${process.pid} `));
    if (!row) return 0;
    const [, mem] = row.split(/\s+/, 2);
    return mem ? parseTopMemValueToBytes(mem) : 0;
  } catch {
    return 0;
  }
}

interface WindowsMemoryCounters {
  workingSetPrivate: number;
  commit: number;
}

function readPositiveNumber(value: unknown): number {
  const bytes = Number(value);
  return Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
}

function getWindowsMemoryCounters(): WindowsMemoryCounters {
  if (os.platform() !== 'win32') {
    return { workingSetPrivate: 0, commit: 0 };
  }

  try {
    const command = [
      `$proc = Get-CimInstance Win32_PerfRawData_PerfProc_Process -Filter "IDProcess=${process.pid}" | Select-Object -First 1;`,
      'if ($null -eq $proc) {',
      '  "{}"',
      '} else {',
      '  [pscustomobject]@{',
      '    WorkingSetPrivate = [UInt64]$proc.WorkingSetPrivate;',
      '    Commit = [UInt64]$proc.PrivateBytes',
      '  } | ConvertTo-Json -Compress',
      '}',
    ].join(' ');
    const output = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        command,
      ],
      { encoding: 'utf8', timeout: 1500 },
    ).trim();
    const parsed = output ? JSON.parse(output) : {};
    return {
      workingSetPrivate: readPositiveNumber(parsed.WorkingSetPrivate),
      commit: readPositiveNumber(parsed.Commit),
    };
  } catch {
    return { workingSetPrivate: 0, commit: 0 };
  }
}

export function getMemoryUsageSnapshot(): MemoryUsageSnapshot {
  const mem = process.memoryUsage();
  const platform = os.platform();

  if (platform === 'win32') {
    const counters = getWindowsMemoryCounters();
    return {
      primary: counters.workingSetPrivate,
      secondary: counters.commit,
      primaryLabel: 'Working Set Private',
      secondaryLabel: 'Commit',
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    };
  }

  if (platform === 'darwin') {
    return {
      primary: getActivityMonitorMemory(),
      secondary: mem.rss,
      primaryLabel: 'Footprint',
      secondaryLabel: 'RSS',
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    };
  }

  return {
    primary: mem.rss,
    secondary: mem.heapTotal,
    primaryLabel: 'RSS',
    secondaryLabel: 'Heap Total',
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
  };
}

export function getMemoryUsageDelta(
  before: MemoryUsageSnapshot,
  after: MemoryUsageSnapshot,
): MemoryUsageDelta {
  return {
    primary: Math.max(0, after.primary - before.primary),
    secondary: Math.max(0, after.secondary - before.secondary),
    primaryLabel: after.primaryLabel,
    secondaryLabel: after.secondaryLabel,
  };
}
