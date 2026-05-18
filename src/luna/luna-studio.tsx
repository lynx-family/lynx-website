import { useRef, useState, type ReactNode } from 'react';
import { useDark, withBase } from '@rspress/core/runtime';
import { useContainerResize } from '@dugyu/luna-stage';
import { Choreography } from '@dugyu/luna-studio';
import type {
  LunaThemeKey,
  LunaThemeMode,
  LunaThemeVariant,
  StudioViewMode,
} from '@dugyu/luna-studio';
import {
  Columns2,
  GalleryHorizontalEnd,
  Lock,
  LockOpen,
  Moon,
  Sparkle,
  Grid2x2,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  createDemoInteractionHandler,
  createDemoResolveFocusKey,
  createDemoStageGlobalPropsBuilder,
} from './interaction';
import {
  lunaStudioDemoLayout,
  lunaStudioDemoModeGrid,
  lunaStudioShowcaseLayout,
} from './layout';

const VIEW_MODES: StudioViewMode[] = ['compare', 'focus', 'lineup'];

const NEXT_VIEW_MODE: Record<StudioViewMode, StudioViewMode> = {
  compare: 'focus',
  focus: 'lineup',
  lineup: 'compare',
};

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

const VIEW_MODE_ITEMS: Array<{
  value: StudioViewMode;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'compare', label: 'Compare', icon: Columns2 },
  { value: 'focus', label: 'Focus', icon: GalleryHorizontalEnd },
  { value: 'lineup', label: 'Lineup', icon: Grid2x2 },
];

const THEME_VARIANT_ITEMS: Array<{
  value: LunaThemeVariant;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'luna', label: 'Luna', icon: Sparkle },
  { value: 'lunaris', label: 'Lunaris', icon: Sparkles },
];

const THEME_MODE_ITEMS: Array<{
  value: LunaThemeMode;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function IconToggleButton(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  themeMode: LunaThemeMode;
  className?: string;
  disabled?: boolean;
}) {
  const isLight = props.themeMode === 'light';
  const activeClassName = isLight
    ? 'bg-black text-white ring-1 ring-black/20 shadow-sm'
    : 'bg-white/20 text-white ring-1 ring-white/20 shadow-sm';
  const inactiveClassName = isLight
    ? 'bg-transparent text-black/60 opacity-70 hover:bg-black/5 hover:text-black hover:opacity-100'
    : 'bg-transparent text-white/60 opacity-70 hover:bg-white/10 hover:text-white hover:opacity-100';

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-pressed={props.active}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      title={props.label}
      className={cn(
        'h-9 w-9 rounded-full border transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2',
        isLight
          ? 'border-black/10 focus-visible:ring-black/30 focus-visible:ring-offset-background'
          : 'border-white/10 focus-visible:ring-white/40 focus-visible:ring-offset-background',
        props.active ? activeClassName : inactiveClassName,
        props.className,
      )}
    >
      <props.icon className="h-4 w-4 md:h-5 md:w-5" />
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
      return NEXT_VIEW_MODE[prevMode] ?? 'compare';
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
      : 'bg-[#000000] text-white';

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
        'relative h-[360px] w-full overflow-hidden transition-all',
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

function LunaStudioShowcase({
  className,
  defaultViewMode = 'lineup',
  defaultThemeMode,
  defaultThemeModeLocked = true,
}: {
  className?: string;
  defaultViewMode?: StudioViewMode;
  defaultThemeMode?: LunaThemeMode;
  defaultThemeModeLocked?: boolean;
}) {
  const pageIsDark = useDark();
  const pageThemeMode: LunaThemeMode = pageIsDark ? 'dark' : 'light';

  const [viewMode, setViewMode] = useState<StudioViewMode>(defaultViewMode);
  const [themeVariant, setThemeVariant] = useState<LunaThemeVariant>('lunaris');
  const [themeModeLocked, setThemeModeLocked] = useState<boolean>(
    defaultThemeModeLocked,
  );
  const [localThemeMode, setLocalThemeMode] = useState<LunaThemeMode>(
    defaultThemeMode ?? pageThemeMode,
  );
  const [studioAutoplay, setStudioAutoplay] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: containerWidth } = useContainerResize({ ref: containerRef });
  const containerHeight =
    containerWidth === undefined
      ? 420
      : containerWidth < 640
        ? 520
        : containerWidth < 800
          ? 580
          : 640;

  const themeMode = themeModeLocked ? pageThemeMode : localThemeMode;
  const studioThemeKey: LunaThemeKey = `${themeVariant}-${themeMode}`;

  const handleRequestViewModeChange = (params: {
    suggestedViewMode?: StudioViewMode;
  }) => {
    setViewMode((prevMode) => {
      if (params.suggestedViewMode !== undefined) {
        return params.suggestedViewMode;
      }
      return NEXT_VIEW_MODE[prevMode] ?? defaultViewMode;
    });
  };

  const handleInteraction = createDemoInteractionHandler({
    onThemeModeChange: (mode) => {
      if (!themeModeLocked) setLocalThemeMode(mode);
    },
    onThemeVariantChange: setThemeVariant,
    onAutoplayChange: setStudioAutoplay,
    onRequestViewModeChange: handleRequestViewModeChange,
  });

  const isLight = themeMode === 'light';
  const containerClassName = themeModeLocked
    ? 'bg-canvas-ambient text-foreground'
    : isLight
      ? 'bg-[#f5f5f5] text-black'
      : 'bg-[#000000] text-white';
  const dividerClassName = themeModeLocked
    ? 'bg-rule'
    : isLight
      ? 'bg-black/10'
      : 'bg-white/10';
  const controlsBgClassName = themeModeLocked
    ? 'bg-soft'
    : isLight
      ? 'bg-[#ffffffbb]'
      : 'bg-[#0000001a]';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative isolate w-full overflow-hidden rounded-[24px] transition-all duration-300',
        containerClassName,
        className,
      )}
      style={{ height: containerHeight }}
    >
      <div className="relative z-0 h-full w-full p-6 px-4">
        <Choreography
          bundleRoot={BUNDLE_ROOT}
          className="gap-4"
          layout={lunaStudioShowcaseLayout}
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

      <div
        className={cn(
          'absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full shadow-sm backdrop-blur transform-gpu md:left-auto md:right-4 md:translate-x-0',
          controlsBgClassName,
        )}
      >
        <div className="flex items-center gap-1 px-2 py-2 md:flex-col md:justify-between md:gap-2 md:px-2 md:py-3">
          {VIEW_MODE_ITEMS.map((item) => (
            <IconToggleButton
              key={item.value}
              active={viewMode === item.value}
              icon={item.icon}
              label={item.label}
              themeMode={themeMode}
              onClick={() => setViewMode(item.value)}
            />
          ))}

          <div
            className={cn(
              'mx-1 h-px w-2 md:mx-0 md:h-6 md:w-px',
              dividerClassName,
            )}
          />

          {THEME_VARIANT_ITEMS.map((item) => (
            <IconToggleButton
              key={item.value}
              active={themeVariant === item.value}
              icon={item.icon}
              label={item.label}
              themeMode={themeMode}
              onClick={() => setThemeVariant(item.value)}
            />
          ))}

          <div
            className={cn(
              'mx-1 h-px w-2 md:mx-0 md:h-6 md:w-px',
              dividerClassName,
            )}
          />

          {THEME_MODE_ITEMS.map((item) => (
            <IconToggleButton
              key={item.value}
              active={themeMode === item.value}
              icon={item.icon}
              label={item.label}
              themeMode={themeMode}
              disabled={themeModeLocked}
              onClick={() => setLocalThemeMode(item.value)}
            />
          ))}

          <div
            className={cn(
              'mx-1 h-px w-1 md:mx-0 md:h-6 md:w-px',
              dividerClassName,
            )}
          />

          <IconToggleButton
            active={themeModeLocked}
            icon={themeModeLocked ? Lock : LockOpen}
            label={themeModeLocked ? 'Theme synced' : 'Theme local'}
            themeMode={themeMode}
            onClick={() => {
              setThemeModeLocked((prev) => {
                const next = !prev;
                if (prev) setLocalThemeMode(pageThemeMode);
                return next;
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

export { LunaStudio, LunaStudioShowcase };
