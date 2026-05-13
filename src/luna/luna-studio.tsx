import { useRef, useState, type ReactNode } from 'react';
import { withBase } from '@rspress/core/runtime';
import { useContainerResize } from '@dugyu/luna-stage';
import { Choreography } from '@dugyu/luna-studio';
import type {
  LunaThemeKey,
  LunaThemeMode,
  LunaThemeVariant,
  StudioViewMode,
} from '@dugyu/luna-studio';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  createDemoInteractionHandler,
  createDemoResolveFocusKey,
  createDemoStageGlobalPropsBuilder,
} from './interaction';
import { lunaStudioDemoLayout, lunaStudioDemoModeGrid } from './layout';

const VIEW_MODES: StudioViewMode[] = ['compare', 'focus', 'lineup'];

const resolveFocusKey = createDemoResolveFocusKey(lunaStudioDemoLayout);

const BUNDLE_ROOT = withBase('/lynx-examples/luna-demo-bundles/dist/');

function ChipButton(props: {
  active: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <Button
      className={props.className}
      onClick={props.onClick}
      size="sm"
      type="button"
      variant="ghost"
      aria-pressed={props.active}
    >
      {props.children}
    </Button>
  );
}

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

  const chipClassName = (active: boolean) => {
    if (themeMode === 'light') {
      return cn(
        'h-auto rounded-full border px-4 py-2 text-sm font-normal transition-colors',
        active
          ? 'border-black bg-black !text-white hover:bg-black/90 hover:!text-white'
          : 'border-black/20 bg-transparent !text-black hover:bg-black/5 hover:!text-black',
      );
    }

    return cn(
      'h-auto rounded-full border px-4 py-2 text-sm font-normal transition-colors',
      active
        ? 'border-white/60 bg-white/10 !text-white hover:bg-white/15 hover:!text-white'
        : 'border-white/20 bg-transparent !text-white/80 hover:bg-white/10 hover:!text-white',
    );
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
            <ChipButton
              key={mode}
              active={active}
              className={chipClassName(active)}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </ChipButton>
          );
        })}
        <div className={['mx-2 h-6 w-px', dividerClassName].join(' ')} />
        <ChipButton
          active={themeVariant === 'luna'}
          className={chipClassName(themeVariant === 'luna')}
          onClick={() => setStudioThemeVariant('luna')}
        >
          luna
        </ChipButton>
        <ChipButton
          active={themeVariant === 'lunaris'}
          className={chipClassName(themeVariant === 'lunaris')}
          onClick={() => setStudioThemeVariant('lunaris')}
        >
          lunaris
        </ChipButton>
        <div className={['mx-2 h-6 w-px', dividerClassName].join(' ')} />
        <ChipButton
          active={themeMode === 'light'}
          className={chipClassName(themeMode === 'light')}
          onClick={() => setStudioThemeMode('light')}
        >
          light
        </ChipButton>
        <ChipButton
          active={themeMode === 'dark'}
          className={chipClassName(themeMode === 'dark')}
          onClick={() => setStudioThemeMode('dark')}
        >
          dark
        </ChipButton>
      </div>
    </div>
  );
}

export { LunaStudio };
