import { HomeLayout as DefaultHomeLayout } from '@rspress/core/theme-original';
import { GalaxyRings } from './components';
import { AfterHero } from './components/after-hero';
export { createCliStrLynxtron } from './components/CreateBlockCli';
import './index.scss';
import { useEffect, useRef, useState } from 'react';

export const HomeLayout = (props: any) => {
  const customAfterHero = <></>;

  const GalaxyBg = () => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [ringSize, setRingSize] = useState<number>();

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
        const nextRingSize = Math.round(completeHeight * 1.8);
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
    return (
      <div className="galaxy-bg" ref={ref}>
        {ringSize ? (
          <GalaxyRings
            sizePx={ringSize}
            tiltDeg={60}
            ringRotA={Math.PI / 4}
            ringRotB={-Math.PI / 4}
            axisDeltaA={(25 * Math.PI) / 180}
            axisDeltaB={(25 * Math.PI) / 180}
            rxBaseRatio={0.4}
            ringLayers={4}
            ringThickness={43}
            innerInsetRatio={0.02}
            particlesPerLayer={100}
            baseParticleRadiusRatio={0.005}
            ringThicknessRatio={0.05}
            hueLeftA={149.8}
            hueRightA={30}
            hueLeftB={30}
            hueRightB={149.8}
            dprScale={true}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <DefaultHomeLayout
        {...props}
        afterHero={<AfterHero />}
        beforeHero={<GalaxyBg />}
      />
    </div>
  );
};

export * from '@rspress/core/theme-original';
