import React, { useEffect, useRef } from 'react';

export interface GalaxyRingsProps {
  sizePx?: number;
  tiltDeg?: number;
  ringRotA?: number;
  ringRotB?: number;
  axisDeltaA?: number;
  axisDeltaB?: number;
  rxBaseRatio?: number;
  ringLayers?: number;
  ringThickness?: number;
  ringThicknessRatio?: number;
  innerInsetRatio?: number;
  particlesPerLayer?: number;
  baseParticleRadius?: number;
  baseParticleRadiusRatio?: number;
  hueLeftA?: number;
  hueRightA?: number;
  hueLeftB?: number;
  hueRightB?: number;
  dprScale?: boolean;
  adaptiveStride?: boolean;
  randomSeed?: number;
  lightScale?: number;
  saturation?: number;
  alphaBoost?: number;
  coreLight?: number;
  coreSat?: number;
  tailHalo?: number;
  alphaCleanIntervalMs?: number;
  alphaThreshold255?: number;
  className?: string;
  canvasClassName?: string;
  style?: React.CSSProperties;
}

export const GalaxyRings: React.FC<GalaxyRingsProps> = (props) => {
  const {
    sizePx,
    tiltDeg = 60,
    ringRotA = Math.PI / 4,
    ringRotB = -Math.PI / 4,
    axisDeltaA = (10 * Math.PI) / 180,
    axisDeltaB = (-10 * Math.PI) / 180,
    rxBaseRatio = 0.28,
    ringLayers = 8,
    ringThickness = 44,
    ringThicknessRatio,
    innerInsetRatio = 0.32,
    particlesPerLayer = 240,
    baseParticleRadius = 0.8,
    hueLeftA = 140,
    hueRightA = 12,
    hueLeftB = 140,
    hueRightB = 12,
    dprScale = true,
    adaptiveStride = true,
    randomSeed,
    lightScale = 1.25,
    saturation = 100,
    alphaBoost = 1,
    coreLight = 96,
    coreSat = 40,
    tailHalo = 0.3,
    alphaCleanIntervalMs = 500,
    alphaThreshold255,
    className,
    canvasClassName,
    baseParticleRadiusRatio = 0.005,
    style,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const getCanvasSize = () =>
    Math.max(1, Math.floor(sizePx ?? window.innerHeight));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const size = getCanvasSize();
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const tilt = (tiltDeg * Math.PI) / 180;
    const off = (canvas as any).transferControlToOffscreen();

    const worker = new Worker(new URL('./galaxy-worker.js', import.meta.url), {
      type: 'classic',
    });
    workerRef.current = worker;

    worker.postMessage(
      {
        type: 'init',
        canvas: off,
        width: size,
        height: size,
        dprScale,
        randomSeed,
        config: {
          tilt,
          ringRotA,
          ringRotB,
          axisDeltaA,
          axisDeltaB,
          rxBaseRatio,
          ringLayers,
          ringThickness,
          ringThicknessRatio,
          innerInsetRatio,
          particlesPerLayer,
          baseParticleRadius,
          baseParticleRadiusRatio,
          hueLeftA,
          hueRightA,
          hueLeftB,
          hueRightB,
          adaptiveStride,
          lightScale,
          saturation,
          alphaBoost,
          coreLight,
          coreSat,
          tailHalo,
          alphaCleanIntervalMs,
          alphaThreshold255,
        },
      },
      [off],
    );

    return () => {
      workerRef.current = null;
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const worker = workerRef.current;
    if (!canvas || !worker) return;

    const size = getCanvasSize();
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    worker.postMessage({
      type: 'resize',
      width: size,
      height: size,
      dprScale,
    });
  }, [dprScale, sizePx]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <canvas ref={canvasRef} className={canvasClassName} />
    </div>
  );
};
