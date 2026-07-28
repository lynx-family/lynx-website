import { useEffect, useState } from '@lynx-js/react';
import '@lynxtron-showcases/config/tokens.css';
import './App.css';

declare const NativeModules: any;

const CANVAS_ID = 'native-texture-canvas-main';

type Brush = {
  id: string;
  name: string;
  color: string;
  className: string;
};

const BRUSHES: Brush[] = [
  { id: 'ink', name: 'Ink', color: '#111827', className: 'swatch-ink' },
  { id: 'coral', name: 'Coral', color: '#E11D48', className: 'swatch-coral' },
  { id: 'blue', name: 'Blue', color: '#2563EB', className: 'swatch-blue' },
  { id: 'green', name: 'Green', color: '#059669', className: 'swatch-green' },
  { id: 'gold', name: 'Gold', color: '#D97706', className: 'swatch-gold' },
];

const BRUSH_SIZES = [4, 10, 18, 30];
const OPACITIES = [0.35, 0.65, 1];

function getCanvasApi() {
  try {
    return NativeModules.NativeTextureCanvasModule ?? null;
  } catch {
    return null;
  }
}

export function App() {
  const [activeBrushId, setActiveBrushId] = useState(BRUSHES[0].id);
  const [brushSize, setBrushSize] = useState(18);
  const [opacity, setOpacity] = useState(1);
  const [nativeReady, setNativeReady] = useState(false);
  const [status, setStatus] = useState('Ink brush / 18px / 100% opacity');

  const activeBrush =
    BRUSHES.find((brush) => brush.id === activeBrushId) ?? BRUSHES[0];

  useEffect(() => {
    const canvasApi = getCanvasApi();
    if (!canvasApi) {
      setNativeReady(false);
      setStatus('Native texture canvas module is not registered.');
      return;
    }

    const ok = canvasApi.setBrush(
      CANVAS_ID,
      activeBrush.color,
      brushSize,
      opacity,
    );
    setNativeReady(Boolean(ok));
    setStatus(
      `${activeBrush.name} brush / ${brushSize}px / ${Math.round(opacity * 100)}% opacity`,
    );
  }, [activeBrush.color, activeBrush.name, brushSize, opacity]);

  const clearCanvas = () => {
    const canvasApi = getCanvasApi();
    if (!canvasApi) {
      setStatus('Native texture canvas module is not registered.');
      return;
    }

    const ok = canvasApi.clear(CANVAS_ID);
    setNativeReady(Boolean(ok));
    setStatus(ok ? 'Canvas cleared.' : 'Canvas is still mounting.');
  };

  return (
    <view className="shell">
      <view className="topbar">
        <text className="app-title">Native texture canvas</text>
        <view className="native-status">
          <view
            className={`native-dot ${nativeReady ? 'native-dot-ready' : 'native-dot-pending'}`}
          />
          <text className="native-status-text">
            {nativeReady ? 'Native ready' : 'Native pending'}
          </text>
        </view>
      </view>

      <view className="workspace">
        <view className="tool-panel">
          <view className="tool-section">
            <text className="section-title">Brush</text>
            <view className="swatch-row">
              {BRUSHES.map((brush) => (
                <view
                  key={brush.id}
                  className={`swatch ${brush.className} ${activeBrushId === brush.id ? 'swatch-active' : ''}`}
                  bindtap={() => setActiveBrushId(brush.id)}
                />
              ))}
            </view>
            <text className="section-value">{activeBrush.name}</text>
          </view>

          <view className="tool-section">
            <text className="section-title">Size</text>
            <view className="segmented">
              {BRUSH_SIZES.map((size) => (
                <view
                  key={size}
                  className={`segment ${brushSize === size ? 'segment-active' : ''}`}
                  bindtap={() => setBrushSize(size)}
                >
                  <text
                    className={`segment-text ${brushSize === size ? 'segment-text-active' : ''}`}
                  >
                    {size}px
                  </text>
                </view>
              ))}
            </view>
          </view>

          <view className="tool-section">
            <text className="section-title">Opacity</text>
            <view className="segmented">
              {OPACITIES.map((value) => (
                <view
                  key={value}
                  className={`segment ${opacity === value ? 'segment-active' : ''}`}
                  bindtap={() => setOpacity(value)}
                >
                  <text
                    className={`segment-text ${opacity === value ? 'segment-text-active' : ''}`}
                  >
                    {Math.round(value * 100)}%
                  </text>
                </view>
              ))}
            </view>
          </view>

          <view className="tool-section tool-section-action">
            <text className="section-title">Surface</text>
            <view className="clear-button" bindtap={clearCanvas}>
              <text className="clear-button-text">Clear</text>
            </view>
          </view>
        </view>

        <view className="canvas-panel">
          <view className="canvas-header">
            <text className="canvas-title">Native texture</text>
            <text className="canvas-status">{status}</text>
          </view>

          <view className="canvas-frame">
            <native-texture-canvas
              className="native-canvas"
              canvas-id={CANVAS_ID}
            />
          </view>
        </view>
      </view>
    </view>
  );
}
