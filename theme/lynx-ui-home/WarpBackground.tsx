// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { motion } from 'motion/react';
import React, { HTMLAttributes, useCallback, useMemo } from 'react';

interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  perspective?: number;
  beamsPerSide?: number;
  beamSize?: number;
  beamDelayMax?: number;
  beamDelayMin?: number;
  beamDuration?: number;
  gridColor?: string;
  gridSize?: number;
  gridLineWidth?: number;
}

const Beam = ({
  width,
  x,
  delay,
  duration,
}: {
  width: string | number;
  x: string | number;
  delay: number;
  duration: number;
}) => {
  const hue = Math.floor(Math.random() * 360);
  const ar = Math.floor(Math.random() * 10) + 1;

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${x}`,
        top: 0,
        width: `${width}`,
        aspectRatio: `1/${ar}`,
        background: `linear-gradient(hsl(${hue} 80% 60%), transparent)`,
        transform: 'translateX(-50%)',
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
  perspective = 100,
  className,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  gridColor = 'hsl(var(--border))',
  gridSize = beamSize,
  gridLineWidth = 1,
  ...props
}) => {
  const generateBeams = useCallback(() => {
    const beams = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = cellsPerSide / beamsPerSide;

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      const delay =
        Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
      beams.push({ x, delay });
    }
    return beams;
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin]);

  const generateBeamsHorizontal = useCallback(() => {
    const beams = [];
    const cellsPerSide = Math.floor(100 / gridSize); // 25
    const step = cellsPerSide / beamsPerSide; // 5 beams
    const beamX = [0, 22, 46, 70, 100];
    for (let i = 0; i < beamsPerSide; i++) {
      const x = beamX[i];
      const delay =
        Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
      beams.push({ x, delay });
    }
    return beams;
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin]);

  const topBeams = useMemo(() => generateBeams(), [generateBeams]);
  const rightBeams = useMemo(() => generateBeamsHorizontal(), [generateBeams]);
  const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
  const leftBeams = useMemo(() => generateBeamsHorizontal(), [generateBeams]);

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    borderRadius: '0.25rem',
    // border: '1px solid transparent',
    // padding: '5rem'
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
    height: '70vh',
    ['--perspective' as string]: `${perspective}px`,
    ['--grid-color' as string]: gridColor,
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
    <div className={className} style={containerStyles} {...props}>
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
            />
          ))}
        </div>
      </div>
      <div style={childContainerStyles}>{children}</div>
    </div>
  );
};
