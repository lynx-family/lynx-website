import { useRef, useState } from 'react';
import { withBase } from '@rspress/core/runtime';
import { useContainerResize } from '@dugyu/luna-stage';
import { Choreography } from '@dugyu/luna-studio';
import type {
  LunaThemeKey,
  LunaThemeMode,
  LunaThemeVariant,
  StudioViewMode,
} from '@dugyu/luna-studio';

import {
  createDemoInteractionHandler,
  createDemoResolveFocusKey,
  createDemoStageGlobalPropsBuilder,
} from './interaction';
import { lunaStudioDemoLayout, lunaStudioDemoModeGrid } from './layout';

const VIEW_MODES: StudioViewMode[] = ['compare', 'focus', 'lineup'];

const resolveFocusKey = createDemoResolveFocusKey(lunaStudioDemoLayout);

const BUNDLE_ROOT = withBase('/lynx-examples/luna-demo-bundles/dist/');

function LunaStudio() {
  const [viewMode, setViewMode] = useState<StudioViewMode>('compare');
  const [themeVariant, setThemeVariant] = useState<LunaThemeVariant>('lunaris');
  const [themeMode, setThemeMode] = useState<LunaThemeMode>('dark');
  const [studioAutoplay, setStudioAutoplay] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: containerWidth } = useContainerResize({ ref: containerRef });
  const containerHeight =
    containerWidth === undefined
      ? 360
      : containerWidth < 640
        ? 480
        : containerWidth < 800
          ? 540
          : 600;

  const studioThemeKey: LunaThemeKey = `${themeVariant}-${themeMode}`;

  const setStudioThemeVariant = (variant: LunaThemeVariant) => {
    setThemeVariant(variant);
  };

  const setStudioThemeMode = (mode: LunaThemeMode) => {
    setThemeMode(mode);
  };

  const handleRequestViewModeChange = (params: {
    suggestedViewMode?: StudioViewMode;
  }) => {
    setViewMode((prevMode) => {
      if (params.suggestedViewMode !== undefined) {
        return params.suggestedViewMode;
      }

      const index = VIEW_MODES.indexOf(prevMode);
      if (index < 0) return VIEW_MODES[0];
      return VIEW_MODES[(index + 1) % VIEW_MODES.length];
    });
  };

  const handleInteraction = createDemoInteractionHandler({
    onThemeModeChange: setStudioThemeMode,
    onThemeVariantChange: setStudioThemeVariant,
    onAutoplayChange: setStudioAutoplay,
    onRequestViewModeChange: handleRequestViewModeChange,
  });

  const containerClassName =
    themeMode === 'light'
      ? 'bg-[#f5f5f5] text-black'
      : 'bg-[#0d0d0d] text-white';

  const dividerClassName =
    themeMode === 'light' ? 'bg-black/10' : 'bg-white/10';

  const chipBaseClassName =
    'rounded-full border px-4 py-2 text-sm transition-colors';

  const chipClassName = (active: boolean) => {
    if (themeMode === 'light') {
      return [
        chipBaseClassName,
        active
          ? 'border-black bg-black text-white'
          : 'border-black/20 bg-transparent text-black',
      ].join(' ');
    }

    return [
      chipBaseClassName,
      active
        ? 'border-white bg-white text-black'
        : 'border-white/20 bg-transparent text-white',
    ].join(' ');
  };

  return (
    <div
      ref={containerRef}
      className={[
        'relative h-[360px] w-full overflow-hidden',
        containerClassName,
      ].join(' ')}
      style={{ height: containerHeight }}
    >
      <div className="relative h-full w-full p-6 pt-24">
        <Choreography
          bundleRoot={BUNDLE_ROOT}
          className="gap-4"
          layout={lunaStudioDemoLayout}
          modeGrid={lunaStudioDemoModeGrid}
          viewMode={viewMode}
          defaultFocusKey="button"
          resolveFocusKey={resolveFocusKey}
          buildStageGlobalProps={createDemoStageGlobalPropsBuilder({
            studioThemeKey,
            studioAutoplay,
          })}
          interactionTarget="content"
          onInteraction={handleInteraction}
          themeKey={studioThemeKey}
        />
      </div>
      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-center gap-3 px-6 py-4">
        {VIEW_MODES.map((mode) => {
          const active = mode === viewMode;
          return (
            <button
              key={mode}
              className={chipClassName(active)}
              onClick={() => setViewMode(mode)}
              type="button"
              {...{ 'aria-pressed': active }}
            >
              {mode}
            </button>
          );
        })}
        <div className={['mx-2 h-6 w-px', dividerClassName].join(' ')} />
        <button
          className={chipClassName(themeVariant === 'luna')}
          onClick={() => setStudioThemeVariant('luna')}
          type="button"
          {...{ 'aria-pressed': themeVariant === 'luna' }}
        >
          luna
        </button>
        <button
          className={chipClassName(themeVariant === 'lunaris')}
          onClick={() => setStudioThemeVariant('lunaris')}
          type="button"
          {...{ 'aria-pressed': themeVariant === 'lunaris' }}
        >
          lunaris
        </button>
        <div className={['mx-2 h-6 w-px', dividerClassName].join(' ')} />
        <button
          className={chipClassName(themeMode === 'light')}
          onClick={() => setStudioThemeMode('light')}
          type="button"
          {...{ 'aria-pressed': themeMode === 'light' }}
        >
          light
        </button>
        <button
          className={chipClassName(themeMode === 'dark')}
          onClick={() => setStudioThemeMode('dark')}
          type="button"
          {...{ 'aria-pressed': themeMode === 'dark' }}
        >
          dark
        </button>
      </div>
    </div>
  );
}

export { LunaStudio };
