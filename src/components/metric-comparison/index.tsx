import { useId, useState } from 'react';
import styles from './index.module.css';

export interface MetricComparisonSeries {
  /** Key used to look up values in each metric. */
  key: string;
  label: string;
}

export interface MetricComparisonMetric {
  title: string;
  /** Short reading hint, such as "Higher is better". */
  hint?: string;
  unit?: string;
  /** Upper bound of the scale. Defaults to the largest value in the metric. */
  max?: number;
  /** Fraction digits used for values. Defaults to 1. */
  digits?: number;
  values: Record<string, number>;
}

export interface MetricComparisonGroup {
  title: string;
  metrics: MetricComparisonMetric[];
}

export interface MetricComparisonProps {
  /**
   * Exactly two series. The first series is the subject of the comparison and
   * uses the accent color; the second is the reference.
   */
  series: [MetricComparisonSeries, MetricComparisonSeries];
  groups: MetricComparisonGroup[];
  /** Accessible name of the whole figure. */
  label: string;
}

const formatValue = (value: number, digits: number, unit?: string) =>
  `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`;

function MetricPanel({
  metric,
  series,
}: {
  metric: MetricComparisonMetric;
  series: MetricComparisonProps['series'];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const tooltipId = useId();
  const digits = metric.digits ?? 1;
  const max =
    metric.max ??
    Math.max(...series.map((item) => metric.values[item.key] ?? 0));

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>{metric.title}</div>
      {metric.hint && <div className={styles.panelHint}>{metric.hint}</div>}
      <div className={styles.rows}>
        {series.map((item, index) => {
          const value = metric.values[item.key];
          const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
          const active = hovered === item.key;
          return (
            <div
              key={item.key}
              className={styles.row}
              data-dimmed={hovered !== null && !active ? '' : undefined}
              onMouseEnter={() => setHovered(item.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(item.key)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              aria-describedby={active ? tooltipId : undefined}
            >
              <span className={styles.seriesLabel}>{item.label}</span>
              <span className={styles.track}>
                <span
                  className={styles.bar}
                  data-slot={index}
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className={styles.value}>
                {formatValue(value, digits, metric.unit)}
              </span>
            </div>
          );
        })}
      </div>
      <div
        id={tooltipId}
        role="tooltip"
        className={styles.tooltip}
        data-visible={hovered !== null ? '' : undefined}
      >
        {series
          .map(
            (item) =>
              `${item.label} ${formatValue(metric.values[item.key], digits, metric.unit)}`,
          )
          .join(' · ')}
      </div>
    </div>
  );
}

/**
 * Small-multiple bar chart that compares two series across metrics with
 * different units. Each metric keeps its own scale; values are always
 * labeled directly, so the chart never relies on color alone.
 */
export function MetricComparison({
  series,
  groups,
  label,
}: MetricComparisonProps) {
  return (
    <figure className={styles.root} aria-label={label}>
      <div className={styles.legend} aria-hidden="true">
        {series.map((item, index) => (
          <span key={item.key} className={styles.legendItem}>
            <span className={styles.swatch} data-slot={index} />
            {item.label}
          </span>
        ))}
      </div>
      {groups.map((group) => (
        <section key={group.title} className={styles.group}>
          <div className={styles.groupTitle}>{group.title}</div>
          <div className={styles.panels}>
            {group.metrics.map((metric) => (
              <MetricPanel key={metric.title} metric={metric} series={series} />
            ))}
          </div>
        </section>
      ))}
    </figure>
  );
}

export default MetricComparison;
