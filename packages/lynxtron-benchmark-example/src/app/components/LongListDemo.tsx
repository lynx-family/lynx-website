import { useCallback, useState } from '@lynx-js/react';
import './BenchmarkModule.css';
import './LongListDemo.css';

type ListMode = 'all' | 'hot' | 'dense';

interface ListRow {
  id: number;
  lane: string;
  stage: string;
  bytes: number;
  score: number;
  bucket: 'hot' | 'warm' | 'cool';
}

interface LongListDemoProps {
  onInteractionStart: (startedAt: number) => void;
}

const LIST_ROWS: ListRow[] = Array.from({ length: 360 }, (_, index) => {
  const laneNames = ['Render', 'Layout', 'Paint', 'Input', 'Cache', 'Decode'];
  const stageNames = [
    'commit',
    'merge',
    'resolve',
    'flush',
    'reconcile',
    'scan',
  ];
  const bucketOrder: Array<ListRow['bucket']> = ['hot', 'warm', 'cool'];

  return {
    id: index,
    lane: laneNames[index % laneNames.length],
    stage: stageNames[(index * 2) % stageNames.length],
    bytes: 12 * 1024 + (index % 15) * 2048 + (index % 7) * 1024,
    score: 8 + ((index * 13) % 37),
    bucket: bucketOrder[index % bucketOrder.length],
  };
});

const MODE_CONFIG: Array<{ id: ListMode; label: string; hint: string }> = [
  { id: 'all', label: 'All', hint: '360 rows' },
  { id: 'hot', label: 'Hot path', hint: 'every 3rd row' },
  { id: 'dense', label: 'Dense', hint: 'skip cooling rows' },
];

function filterRows(mode: ListMode): ListRow[] {
  return LIST_ROWS.filter((row, index) => {
    if (mode === 'all') return true;
    if (mode === 'hot') return row.bucket !== 'cool' || index % 5 === 0;
    return row.bucket !== 'cool' || index % 2 === 0;
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function bucketColor(bucket: ListRow['bucket']): string {
  if (bucket === 'hot') return '#48aff0';
  if (bucket === 'warm') return '#3dd68c';
  return '#608291';
}

export function LongListDemo({ onInteractionStart }: LongListDemoProps) {
  const [mode, setMode] = useState<ListMode>('all');
  const [selectedRowId, setSelectedRowId] = useState(0);

  const visibleRows = filterRows(mode);

  const activeRow =
    visibleRows.find((row) => row.id === selectedRowId) ?? visibleRows[0];

  const handleModeTap = useCallback(
    (nextMode: ListMode) => {
      onInteractionStart(Date.now());
      setMode(nextMode);
      const nextRows = filterRows(nextMode);
      if (nextRows.length > 0) {
        setSelectedRowId(nextRows[0].id);
      }
    },
    [onInteractionStart],
  );

  const handleRowTap = useCallback(
    (rowId: number) => {
      onInteractionStart(Date.now());
      setSelectedRowId(rowId);
    },
    [onInteractionStart],
  );

  return (
    <view className="benchmark-panel long-list-panel">
      <view className="benchmark-panel-header">
        <view className="benchmark-panel-header-main">
          <text className="benchmark-panel-title">Long list stress</text>
          <text className="benchmark-panel-copy">
            Tap rows, change filters, and keep the renderer busy with a dense
            360-row list.
          </text>
        </view>
      </view>

      <view className="benchmark-chip-row">
        {MODE_CONFIG.map((modeConfig) => {
          const active = modeConfig.id === mode;
          return (
            <view
              key={modeConfig.id}
              className={
                active
                  ? 'benchmark-chip benchmark-chip-active'
                  : 'benchmark-chip'
              }
              bindtap={() => handleModeTap(modeConfig.id)}
            >
              <text
                className={
                  active
                    ? 'benchmark-chip-text benchmark-chip-text-active'
                    : 'benchmark-chip-text'
                }
              >
                {modeConfig.label}
              </text>
              <text
                className={
                  active
                    ? 'benchmark-chip-text benchmark-chip-text-active'
                    : 'benchmark-chip-text'
                }
              >
                {' '}
                {modeConfig.hint}
              </text>
            </view>
          );
        })}
      </view>

      <view className="benchmark-stats">
        <view className="benchmark-stat">
          <text className="benchmark-stat-value">{visibleRows.length}</text>
          <text className="benchmark-stat-label">Visible rows</text>
          <text className="benchmark-stat-note">
            Filter updates rerender the full list panel.
          </text>
        </view>
        <view className="benchmark-stat">
          <text className="benchmark-stat-value">
            {activeRow != null ? `${activeRow.id + 1}` : '—'}
          </text>
          <text className="benchmark-stat-label">Selected</text>
          <text className="benchmark-stat-note">
            {activeRow != null
              ? `${activeRow.lane} · ${activeRow.stage}`
              : 'Tap a row'}
          </text>
        </view>
        <view className="benchmark-stat">
          <text className="benchmark-stat-value">
            {activeRow != null ? formatBytes(activeRow.bytes) : '—'}
          </text>
          <text className="benchmark-stat-label">Selected payload</text>
          <text className="benchmark-stat-note">
            Big enough to show layout churn.
          </text>
        </view>
      </view>

      <scroll-view scroll-y className="long-list-scroll">
        {visibleRows.map((row) => {
          const active = activeRow != null && row.id === activeRow.id;
          return (
            <view
              key={row.id}
              className={
                active ? 'long-list-row long-list-row-active' : 'long-list-row'
              }
              bindtap={() => handleRowTap(row.id)}
            >
              <text className="long-list-index">
                {String(row.id + 1).padStart(3, '0')}
              </text>
              <view className="long-list-body">
                <text className="long-list-title">
                  {row.lane} pass {String((row.id % 9) + 1).padStart(2, '0')}
                </text>
                <text className="long-list-subtitle">
                  {row.stage} · {row.bucket} lane · score {row.score}
                </text>
              </view>
              <view
                className="long-list-badge"
                style={{ borderColor: bucketColor(row.bucket) }}
              >
                <text className="long-list-badge-text">
                  {formatBytes(row.bytes)}
                </text>
              </view>
            </view>
          );
        })}
      </scroll-view>
    </view>
  );
}
