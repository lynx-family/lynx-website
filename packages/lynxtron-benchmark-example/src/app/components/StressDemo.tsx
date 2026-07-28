import { useCallback, useEffect, useState } from '@lynx-js/react';
import './BenchmarkModule.css';
import './StressDemo.css';

type StressMode = 24 | 36 | 48;

interface StressDemoProps {
  onInteractionStart: (startedAt: number) => void;
}

const STRESS_MODES: Array<{ id: StressMode; label: string; hint: string }> = [
  { id: 24, label: '24 nodes', hint: 'light' },
  { id: 36, label: '36 nodes', hint: 'balanced' },
  { id: 48, label: '48 nodes', hint: 'dense' },
];

const BAR_COLORS = ['#48aff0', '#137cbd', '#3dd68c', '#608291'];

function calcHeight(frame: number, index: number): number {
  return 20 + Math.round((Math.sin((frame + index) / 3) + 1) * 16);
}

export function StressDemo({ onInteractionStart }: StressDemoProps) {
  const [mode, setMode] = useState<StressMode>(36);
  const [frame, setFrame] = useState(0);

  const handleModeTap = useCallback(
    (nextMode: StressMode) => {
      onInteractionStart(Date.now());
      setMode(nextMode);
    },
    [onInteractionStart],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((value) => value + 1);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const totalNodes = mode;
  const rows = Math.ceil(totalNodes / 4);

  return (
    <view className="benchmark-panel">
      <view className="benchmark-panel-header">
        <view className="benchmark-panel-header-main">
          <text className="benchmark-panel-title">Pulsing render wall</text>
          <text className="benchmark-panel-copy">
            A simplified responsiveness demo: no exact FPS counter, just a
            steady state update loop.
          </text>
        </view>
      </view>

      <view className="benchmark-chip-row">
        {STRESS_MODES.map((stressMode) => {
          const active = stressMode.id === mode;
          return (
            <view
              key={stressMode.id}
              className={
                active
                  ? 'benchmark-chip benchmark-chip-active'
                  : 'benchmark-chip'
              }
              bindtap={() => handleModeTap(stressMode.id)}
            >
              <text
                className={
                  active
                    ? 'benchmark-chip-text benchmark-chip-text-active'
                    : 'benchmark-chip-text'
                }
              >
                {stressMode.label}
              </text>
              <text
                className={
                  active
                    ? 'benchmark-chip-text benchmark-chip-text-active'
                    : 'benchmark-chip-text'
                }
              >
                {' '}
                {stressMode.hint}
              </text>
            </view>
          );
        })}
      </view>

      <view className="benchmark-stats">
        <view className="benchmark-stat">
          <text className="benchmark-stat-value">{totalNodes}</text>
          <text className="benchmark-stat-label">Nodes</text>
          <text className="benchmark-stat-note">
            More nodes = more repeated layout and paint work.
          </text>
        </view>
        <view className="benchmark-stat">
          <text className="benchmark-stat-value">{frame}</text>
          <text className="benchmark-stat-label">Tick</text>
          <text className="benchmark-stat-note">Updated every 80ms.</text>
        </view>
        <view className="benchmark-stat">
          <text className="benchmark-stat-value">4-up</text>
          <text className="benchmark-stat-label">Grid</text>
          <text className="benchmark-stat-note">
            {rows} rows of moving nodes.
          </text>
        </view>
      </view>

      <view className="stress-grid">
        {Array.from({ length: totalNodes }, (_, index) => {
          const height = calcHeight(frame, index);
          const color = BAR_COLORS[index % BAR_COLORS.length];
          return (
            <view key={index} className="stress-cell">
              <view
                className="stress-meter"
                style={{
                  height: `${height}px`,
                  backgroundColor: color,
                  opacity:
                    0.45 + Math.abs(Math.sin((frame + index) / 4)) * 0.55,
                }}
              />
            </view>
          );
        })}
      </view>
    </view>
  );
}
