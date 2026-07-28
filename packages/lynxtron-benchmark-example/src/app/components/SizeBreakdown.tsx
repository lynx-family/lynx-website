import './SizeBreakdown.css';

interface SizeBreakdownProps {
  runtime: number;
  business: number;
  extensions: number;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(0) + ' KB';
  }
  return bytes + ' B';
}

interface BarRowProps {
  label: string;
  size: number;
  total: number;
  color: string;
}

function BarRow({ label, size, total, color }: BarRowProps) {
  const pct = total > 0 ? (size / total) * 100 : 0;
  const pctStr = pct.toFixed(1) + '%';
  const remainStr = (100 - pct).toFixed(1) + '%';

  return (
    <view className="bar-row">
      <view className="bar-track">
        <view
          className="bar-fill"
          style={{ width: pctStr, backgroundColor: color }}
        />
        <view className="bar-empty" style={{ width: remainStr }} />
      </view>
      <view className="bar-label-row">
        <text className="bar-label">{label}</text>
        <text className="bar-size">{formatSize(size)}</text>
      </view>
    </view>
  );
}

export function SizeBreakdown({
  runtime,
  business,
  extensions,
}: SizeBreakdownProps) {
  const total = runtime + business + extensions;

  return (
    <view className="size-breakdown">
      <text className="breakdown-title">App size breakdown</text>
      <BarRow label="Runtime" size={runtime} total={total} color="#137cbd" />
      <BarRow
        label="Business code (Lynx bundle + host)"
        size={business}
        total={total}
        color="#48aff0"
      />
      <BarRow
        label="Native extensions"
        size={extensions}
        total={total}
        color="#3dd68c"
      />
    </view>
  );
}
