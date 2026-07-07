import { getPayloadString, indexResolvedLayout } from '@dugyu/luna-studio';
import type {
  FocusKeyResolver,
  InteractionParams,
  LunaThemeKey,
  LunaThemeMode,
  LunaThemeVariant,
  StageGlobalPropsBuilder,
  StudioResolvedLayout,
  StudioViewMode,
} from '@dugyu/luna-studio';

type StudioEvent = {
  type:
    | 'studioThemeVariant'
    | 'studioThemeMode'
    | 'studioFocusKey'
    | 'studioAutoplay'
    | 'requestViewModeChange';
  payload?: unknown;
  source?: unknown;
};

function isStudioEvent(data: unknown): data is StudioEvent {
  if (data === null || typeof data !== 'object') return false;

  const event = data as { type?: unknown };
  return (
    event.type === 'studioThemeVariant' ||
    event.type === 'studioThemeMode' ||
    event.type === 'studioFocusKey' ||
    event.type === 'studioAutoplay' ||
    event.type === 'requestViewModeChange'
  );
}

export function createDemoResolveFocusKey(
  layout: StudioResolvedLayout,
): FocusKeyResolver {
  const { focusKeys, stageIdToFocusKey } = indexResolvedLayout(layout);

  return (interaction: InteractionParams) => {
    if (interaction.target === 'stage') {
      return stageIdToFocusKey.get(interaction.stageId);
    }

    const call = interaction.runtimeCall;
    if (call === undefined) return undefined;
    if (call.name !== 'emitStudioEvent') return undefined;
    if (!isStudioEvent(call.data)) return undefined;
    if (call.data.type !== 'studioFocusKey') return undefined;

    const next = getPayloadString(call.data.payload, 'focusKey');
    if (next === undefined) return undefined;
    return focusKeys.has(next) ? next : undefined;
  };
}

export function createDemoStageGlobalPropsBuilder(params: {
  studioThemeKey: LunaThemeKey;
  studioAutoplay: boolean;
}): StageGlobalPropsBuilder {
  return ({ viewMode, activeFocusKey }) => {
    return {
      studioViewMode: viewMode,
      studioThemeKey: params.studioThemeKey,
      studioAutoplay: params.studioAutoplay,
      ...(typeof activeFocusKey === 'string' && activeFocusKey !== ''
        ? { studioFocusKey: activeFocusKey }
        : {}),
    };
  };
}

export function createDemoInteractionHandler(params: {
  onThemeVariantChange: (variant: LunaThemeVariant) => void;
  onThemeModeChange: (mode: LunaThemeMode) => void;
  onAutoplayChange: (autoplay: boolean) => void;
  onRequestViewModeChange: (params: {
    source?: string;
    suggestedViewMode?: StudioViewMode;
  }) => void;
}): (interaction: InteractionParams) => void {
  return (interaction: InteractionParams) => {
    if (interaction.target !== 'content') return;
    const call = interaction.runtimeCall;
    if (call === undefined) return;
    if (call.name !== 'emitStudioEvent') return;
    if (!isStudioEvent(call.data)) return;
    const event = call.data;

    if (event.type === 'studioThemeVariant') {
      if (event.payload === 'luna' || event.payload === 'lunaris') {
        params.onThemeVariantChange(event.payload);
      }
      return;
    }

    if (event.type === 'studioThemeMode') {
      if (event.payload === 'light' || event.payload === 'dark') {
        params.onThemeModeChange(event.payload);
      }
      return;
    }

    if (event.type === 'studioAutoplay') {
      if (typeof event.payload === 'boolean') {
        params.onAutoplayChange(event.payload);
      }
      return;
    }

    if (event.type === 'requestViewModeChange') {
      const suggestedViewMode = (() => {
        const payload = event.payload;
        if (payload === null || typeof payload !== 'object') return undefined;
        const candidate = (payload as { suggestedViewMode?: unknown })
          .suggestedViewMode;
        return candidate === 'compare' ||
          candidate === 'focus' ||
          candidate === 'lineup'
          ? candidate
          : undefined;
      })();

      params.onRequestViewModeChange({
        source: typeof event.source === 'string' ? event.source : undefined,
        suggestedViewMode,
      });
      return;
    }
  };
}
