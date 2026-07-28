import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  extraInfo?: string;
  accentColor?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  extraInfo,
  accentColor,
}: MetricCardProps) {
  return (
    <view className="metric-card">
      <text
        className="metric-value"
        style={{ color: accentColor ?? '#f5f8fa' }}
      >
        {value}
      </text>
      <text className="metric-title">{title}</text>
      {subtitle ? <text className="metric-subtitle">{subtitle}</text> : null}
      {extraInfo ? <text className="metric-extra">{extraInfo}</text> : null}
    </view>
  );
}
