import { useEffect, useRef, useState } from 'react';
import { useFixDark } from '@site/theme/hooks/use-fix-dark';
import { GalaxyRings } from './galaxy-rings';
import styles from './index.module.less';

/**
 * Particle-ring backdrop for the Lynxtron home hero. Rendered through the
 * `beforeHero` slot, it sizes itself to its next sibling (the hero section)
 * and centers the ring canvas behind it.
 */
export const GalaxyHeroBackground = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ringSize, setRingSize] = useState<number>();
  // The ring is a continuously-animating canvas; skip it entirely for
  // users who ask for reduced motion.
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sibling = el.nextElementSibling as HTMLElement | null;
    if (!sibling) return;
    const positionedParent = el.offsetParent as HTMLElement | null;
    const parsePx = (value: string) => Number.parseFloat(value) || 0;

    const apply = () => {
      const rect = sibling.getBoundingClientRect();
      const styles = window.getComputedStyle(sibling);
      const marginTop = parsePx(styles.marginTop);
      const marginBottom = parsePx(styles.marginBottom);
      const completeHeight = rect.height + marginTop + marginBottom;
      const completeTop = rect.top - marginTop;
      const parentRect = positionedParent?.getBoundingClientRect();
      // Scale with the hero, but cap by viewport width so the ring stays a
      // halo around the title on phones (where the stacked hero is tall)
      // instead of flooding the whole screen.
      const nextRingSize = Math.round(
        Math.min(completeHeight * 1.8, window.innerWidth * 1.7),
      );
      el.style.width = `${rect.width}px`;
      el.style.height = `${completeHeight}px`;
      el.style.left = `${rect.left - (parentRect?.left ?? 0)}px`;
      el.style.top = `${completeTop - (parentRect?.top ?? 0)}px`;
      setRingSize((prev) => (prev === nextRingSize ? prev : nextRingSize));
    };
    apply();
    let timer: ReturnType<typeof setTimeout>;
    const debouncedApply = () => {
      clearTimeout(timer);
      timer = setTimeout(apply, 150);
    };
    const ro = new ResizeObserver(debouncedApply);
    ro.observe(sibling);
    if (positionedParent) {
      ro.observe(positionedParent);
    }
    window.addEventListener('resize', debouncedApply);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener('resize', debouncedApply);
    };
  }, []);

  // Two palettes, one geometry. Dark keeps the original glow: full-sat
  // green/amber at high lightness, fused into light trails by the additive
  // blending against the near-black page. On the light page that blending
  // can't fuse anything, so every dot reads alone — keep them inside the
  // background wash's own green→teal family at mid value and muted
  // saturation, so the ring reads as deeper strokes of the same atmosphere
  // instead of confetti. The worker reads its palette once at init; keying
  // the component remounts it when the theme flips.
  const dark = useFixDark();
  const palette = dark
    ? {
        lightScale: 1.25,
        saturation: 100,
        // The hot core clips toward warm white, like an overexposed
        // light source; color survives only at the fringes.
        coreLight: 97,
        coreSat: 35,
        hueLeftA: 149.8,
        hueRightA: 30,
        hueLeftB: 30,
        hueRightB: 149.8,
      }
    : {
        lightScale: 0.8,
        saturation: 72,
        // No additive glow against a light page: the leftover trail needs
        // extra pigment to read. Boosts the trail only — the comet head
        // keeps its softer foreground color.
        alphaBoost: 1.7,
        // Inverted exposure: on a light page the hot core is the deepest
        // ink. The hot ramp already adds presence, so the boost drops and
        // the halo nearly vanishes (it would only thicken the stroke).
        coreLight: 34,
        coreSat: 80,
        tailHalo: 0.08,
        hueLeftA: 158,
        hueRightA: 174,
        hueLeftB: 174,
        hueRightB: 158,
      };

  return (
    <div className={styles['galaxy-bg']} ref={ref}>
      {ringSize && !reducedMotion ? (
        <GalaxyRings
          key={dark ? 'dark' : 'light'}
          {...palette}
          sizePx={ringSize}
          canvasClassName={styles['galaxy-canvas']}
          tiltDeg={60}
          ringRotA={Math.PI / 4}
          ringRotB={-Math.PI / 4}
          axisDeltaA={(25 * Math.PI) / 180}
          axisDeltaB={(25 * Math.PI) / 180}
          rxBaseRatio={0.4}
          ringLayers={4}
          ringThickness={43}
          innerInsetRatio={0.02}
          // 1 per layer x 4 layers x 2 rings = 8 comets total: a handful
          // of drifting strokes, not a particle field.
          particlesPerLayer={1}
          baseParticleRadiusRatio={0.005}
          ringThicknessRatio={0.05}
          dprScale={true}
        />
      ) : null}
    </div>
  );
};
