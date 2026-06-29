// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { motion } from 'motion/react';
import React, {
  HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  warpHeight?: React.CSSProperties['height'];
  perspective?: number;
  beamsPerSide?: number;
  beamSize?: number;
  beamDelayMax?: number;
  beamDelayMin?: number;
  beamDuration?: number;
  beamOpacity?: number;
  beamColorVars?: readonly string[];
  gridColor?: string;
  gridOpacity?: number;
  gridSize?: number;
  gridLineWidth?: number;
}

type Rgb = { r: number; g: number; b: number };

const DEFAULT_BEAM_COLOR_VARS = [
  '--major-brand-color',
  '--gradient-brand-color',
  '--second-brand-color',
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const parseHexColor = (value: string): Rgb | null => {
  const raw = value.trim();
  if (!raw.startsWith('#')) return null;
  const hex = raw.slice(1);
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }
  return null;
};

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => {
  const tt = clamp(t, 0, 1);
  return {
    r: Math.round(lerp(a.r, b.r, tt)),
    g: Math.round(lerp(a.g, b.g, tt)),
    b: Math.round(lerp(a.b, b.b, tt)),
  };
};

const readCssVar = (varName: string) => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
};

const pickThemeRgbPalette = (varNames: string[]): Rgb[] => {
  const rgbs = varNames
    .map((name) => parseHexColor(readCssVar(name)))
    .filter((v): v is Rgb => v != null);

  if (rgbs.length > 0) return rgbs;

  return [
    { r: 255, g: 61, b: 99 },
    { r: 255, g: 93, b: 153 },
    { r: 61, g: 213, b: 233 },
  ];
};

const randomLerpedColor = (palette: Rgb[]) => {
  const a = palette[Math.floor(Math.random() * palette.length)];
  const b = palette[Math.floor(Math.random() * palette.length)];
  const t = Math.random();
  return mixRgb(a, b, t);
};

const Beam = ({
  width,
  x,
  delay,
  duration,
  color,
  opacity,
  aspectRatio,
}: {
  width: string | number;
  x: string | number;
  delay: number;
  duration: number;
  color: string;
  opacity: number;
  aspectRatio: string;
}) => {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${x}`,
        top: 0,
        width: `${width}`,
        aspectRatio,
        background: `linear-gradient(${color}, transparent)`,
        transform: 'translateX(-50%)',
        opacity,
      }}
      initial={{ y: '100cqmax', x: '-50%' }}
      animate={{ y: '-100%', x: '-50%' }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
};

export const WarpBackground: React.FC<WarpBackgroundProps> = ({
  children,
  warpHeight,
  perspective = 100,
  className,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  beamOpacity = 0.6,
  beamColorVars = DEFAULT_BEAM_COLOR_VARS,
  gridColor,
  gridOpacity = 1,
  gridSize = beamSize,
  gridLineWidth = 1,
  ...props
}) => {
  const { style, ...restProps } = props;
  const resolvedHeight = warpHeight ?? style?.height ?? '80vh';

  const [beamPalette, setBeamPalette] = useState<Rgb[]>(() =>
    pickThemeRgbPalette([...beamColorVars]),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () =>
      setBeamPalette(pickThemeRgbPalette([...beamColorVars]));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-subsite'],
    });
    return () => observer.disconnect();
  }, [beamColorVars]);

  const resolvedGridColor =
    gridColor ?? `hsl(var(--border) / ${clamp(gridOpacity, 0, 1)})`;

  const buildBeamSpec = useCallback(
    (x: number) => {
      const delay =
        Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
      const ar = Math.floor(Math.random() * 10) + 1;
      const rgb = randomLerpedColor(beamPalette);
      return {
        x,
        delay,
        aspectRatio: `1/${ar}`,
        color: `rgb(${rgb.r} ${rgb.g} ${rgb.b})`,
      };
    },
    [beamDelayMax, beamDelayMin, beamPalette],
  );

  const generateBeams = useCallback(() => {
    const beams = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = cellsPerSide / beamsPerSide;

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      beams.push(buildBeamSpec(x));
    }
    return beams;
  }, [beamsPerSide, beamSize, buildBeamSpec]);

  const generateBeamsHorizontal = useCallback(() => {
    const beams = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = beamsPerSide > 1 ? cellsPerSide / (beamsPerSide - 1) : 0;
    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      beams.push(buildBeamSpec(x));
    }
    return beams;
  }, [beamsPerSide, beamSize, buildBeamSpec]);

  const topBeams = useMemo(() => generateBeams(), [generateBeams]);
  const rightBeams = useMemo(
    () => generateBeamsHorizontal(),
    [generateBeamsHorizontal],
  );
  const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
  const leftBeams = useMemo(
    () => generateBeamsHorizontal(),
    [generateBeamsHorizontal],
  );

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    ...style,
  };

  const warpContainerStyles = {
    pointerEvents: 'none',
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: '100%',
    overflow: 'hidden',
    clipPath: 'inset(0)',
    containerType: 'size' as const,
    perspective: `${perspective}px`,
    transformStyle: 'preserve-3d' as const,
    height: resolvedHeight,
    ['--perspective' as string]: `${perspective}px`,
    ['--grid-color' as string]: resolvedGridColor,
    ['--grid-size' as string]: `${gridSize}%`,
    ['--2-grid-size' as string]: `${2 * gridSize}%`,
    ['--grid-line-width' as string]: `${gridLineWidth}px`,
  } as const;

  const commonSideStyles: React.CSSProperties = {
    position: 'absolute',
    transformStyle: 'preserve-3d',
    backgroundSize: `var(--grid-size) var(--grid-size)`,
    background: `linear-gradient(var(--grid-color) 0 var(--grid-line-width), transparent var(--grid-line-width) var(--grid-size)) 50% / var(--grid-size) var(--grid-size),
                 linear-gradient(90deg, var(--grid-color) 0 var(--grid-line-width), transparent var(--grid-line-width) var(--grid-size)) 50% 50% / var(--grid-size) var(--grid-size)`,
    containerType: 'inline-size',
    height: '100cqmax',
    width: '100cqi',
    transformOrigin: '50% 0%',
    transform: 'rotateX(-90deg)',
  };

  const topSideStyles: React.CSSProperties = {
    ...commonSideStyles,
  };

  const bottomSideStyles: React.CSSProperties = {
    ...commonSideStyles,
    top: '100%',
  };

  const leftSideStyles: React.CSSProperties = {
    ...commonSideStyles,
    left: 0,
    top: 0,
    width: '100cqh',
    transformOrigin: '0% 0%',
    transform: 'rotate(90deg) rotateX(-90deg)',
    backgroundSize: 'var(--2-grid-size) var(--2-grid-size)',
  };

  const rightSideStyles: React.CSSProperties = {
    ...commonSideStyles,
    right: 0,
    top: 0,
    width: '100cqh',
    transformOrigin: '100% 0%',
    transform: 'rotate(-90deg) rotateX(-90deg)',
    backgroundSize: 'var(--grid-size) var(--grid-size)',
  };

  const childContainerStyles: React.CSSProperties = {
    position: 'relative',
  };

  return (
    <div className={className} style={containerStyles} {...restProps}>
      <div style={warpContainerStyles}>
        {/* top side */}
        <div style={topSideStyles}>
          {topBeams.map((beam, index) => (
            <Beam
              key={`top-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              color={beam.color}
              opacity={beamOpacity}
              aspectRatio={beam.aspectRatio}
            />
          ))}
        </div>
        {/* bottom side */}
        <div style={bottomSideStyles}>
          {bottomBeams.map((beam, index) => (
            <Beam
              key={`bottom-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              color={beam.color}
              opacity={beamOpacity}
              aspectRatio={beam.aspectRatio}
            />
          ))}
        </div>
        {/* left side */}
        <div style={leftSideStyles}>
          {leftBeams.map((beam, index) => (
            <Beam
              key={`left-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              color={beam.color}
              opacity={beamOpacity}
              aspectRatio={beam.aspectRatio}
            />
          ))}
        </div>
        {/* right side */}
        <div style={rightSideStyles}>
          {rightBeams.map((beam, index) => (
            <Beam
              key={`right-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              color={beam.color}
              opacity={beamOpacity}
              aspectRatio={beam.aspectRatio}
            />
          ))}
        </div>
      </div>
      {children == null ? null : (
        <div style={childContainerStyles}>{children}</div>
      )}
    </div>
  );
};
