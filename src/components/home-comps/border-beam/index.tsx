import React, { useRef, useEffect } from 'react';
import styles from './index.module.less';

interface BorderBeamProps {
  color?: string;
  size?: number;
  duration?: number;
  className?: string;
}

const BorderBeam: React.FC<BorderBeamProps> = ({
  color = '#12e5e5',
  size = 3,
  duration = 4,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // CSS pixels — kept separate from canvas.width/height so HiDPI scaling
    // doesn't distort the drawn path.
    let cssWidth = 0;
    let cssHeight = 0;
    // Corner radius inherited from the host card. Keeping the beam path on
    // the same curve the host clips to is what stops it bleeding past the
    // rounded corners.
    let radius = 0;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(container);

    function updateCanvasSize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cssWidth = width;
      cssHeight = height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // `.border-beam-frame` uses `border-radius: inherit`, so its computed
      // value matches the host's actual corner radius.
      const parsed = parseFloat(getComputedStyle(container).borderRadius);
      radius = Number.isFinite(parsed) ? parsed : 0;
    }

    updateCanvasSize();

    let animationFrameId: number;
    let startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000;
      const progress = (elapsed % duration) / duration;

      ctx.clearRect(0, 0, cssWidth, cssHeight);
      drawBeam(progress);

      animationFrameId = requestAnimationFrame(animate);
    };

    // Geometry helpers for the rounded-rect path. The path is inset by
    // `lineWidth / 2` so the stroke sits fully inside the host's clip rather
    // than riding the very edge, where the rounded clip leaves a 1–2px tick.
    const getGeometry = () => {
      const inset = size / 2;
      const w = Math.max(cssWidth - 2 * inset, 0);
      const h = Math.max(cssHeight - 2 * inset, 0);
      const r = Math.min(Math.max(radius - inset, 0), w / 2, h / 2);
      const straightX = Math.max(w - 2 * r, 0);
      const straightY = Math.max(h - 2 * r, 0);
      const arc = (Math.PI * r) / 2;
      const perimeter = 2 * straightX + 2 * straightY + 4 * arc;
      return { inset, w, h, r, straightX, straightY, arc, perimeter };
    };

    const drawBeam = (progress: number) => {
      const { perimeter } = getGeometry();
      if (perimeter === 0) return;
      const beamLength = perimeter * 0.05;

      const positionStart = progress * perimeter;
      const positionEnd = (positionStart + beamLength) % perimeter;

      const gradient = createBeamGradient(positionStart, positionEnd);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';

      ctx.beginPath();
      drawPath(positionStart, positionEnd);
      ctx.stroke();
    };

    const createBeamGradient = (start: number, end: number) => {
      const startCoord = getCoordinatesFromDistance(start);
      const endCoord = getCoordinatesFromDistance(end);

      const gradient = ctx.createLinearGradient(
        startCoord.x,
        startCoord.y,
        endCoord.x,
        endCoord.y,
      );

      // Teal head + red body fading to transparent at the tail.
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.2, 'rgba(255, 53, 26, 0.3)');
      gradient.addColorStop(0.5, '#ff351a');
      gradient.addColorStop(0.8, '#ff351a');
      gradient.addColorStop(0.9, '#12e5e5');
      gradient.addColorStop(1, 'transparent');

      return gradient;
    };

    // Map a perimeter distance to a point on the inset rounded rectangle.
    // Path order: top edge → top-right arc → right edge → bottom-right arc →
    // bottom edge → bottom-left arc → left edge → top-left arc.
    const getCoordinatesFromDistance = (distance: number) => {
      const { inset, w, h, r, straightX, straightY, arc, perimeter } =
        getGeometry();
      if (perimeter === 0) return { x: inset, y: inset };

      let d = ((distance % perimeter) + perimeter) % perimeter;

      // 1. Top edge: (r, 0) → (w - r, 0)
      if (d < straightX) return { x: inset + r + d, y: inset };
      d -= straightX;
      // 2. Top-right arc, center (w - r, r), angle -π/2 → 0
      if (d < arc) {
        const a = -Math.PI / 2 + (d / arc) * (Math.PI / 2);
        return {
          x: inset + (w - r) + r * Math.cos(a),
          y: inset + r + r * Math.sin(a),
        };
      }
      d -= arc;
      // 3. Right edge: (w, r) → (w, h - r)
      if (d < straightY) return { x: inset + w, y: inset + r + d };
      d -= straightY;
      // 4. Bottom-right arc, center (w - r, h - r), angle 0 → π/2
      if (d < arc) {
        const a = (d / arc) * (Math.PI / 2);
        return {
          x: inset + (w - r) + r * Math.cos(a),
          y: inset + (h - r) + r * Math.sin(a),
        };
      }
      d -= arc;
      // 5. Bottom edge: (w - r, h) → (r, h)
      if (d < straightX) return { x: inset + (w - r) - d, y: inset + h };
      d -= straightX;
      // 6. Bottom-left arc, center (r, h - r), angle π/2 → π
      if (d < arc) {
        const a = Math.PI / 2 + (d / arc) * (Math.PI / 2);
        return {
          x: inset + r + r * Math.cos(a),
          y: inset + (h - r) + r * Math.sin(a),
        };
      }
      d -= arc;
      // 7. Left edge: (0, h - r) → (0, r)
      if (d < straightY) return { x: inset, y: inset + (h - r) - d };
      d -= straightY;
      // 8. Top-left arc, center (r, r), angle π → 3π/2
      const a = Math.PI + (d / arc) * (Math.PI / 2);
      return {
        x: inset + r + r * Math.cos(a),
        y: inset + r + r * Math.sin(a),
      };
    };

    const drawPath = (start: number, end: number) => {
      const { perimeter } = getGeometry();
      if (end < start) {
        drawPathSegment(start, perimeter);
        drawPathSegment(0, end);
      } else {
        drawPathSegment(start, end);
      }
    };

    const drawPathSegment = (start: number, end: number) => {
      const current = getCoordinatesFromDistance(start);
      ctx.moveTo(current.x, current.y);

      // 1 CSS-pixel step is fine for the smoothing the arcs need.
      const step = 1;
      let d = start;
      while (d < end) {
        d += step;
        const point = getCoordinatesFromDistance(d);
        ctx.lineTo(point.x, point.y);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [color, size, duration]);

  return (
    <div
      ref={containerRef}
      className={`${styles['border-beam-frame']} ${className}`.trim()}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};

export { BorderBeam };
