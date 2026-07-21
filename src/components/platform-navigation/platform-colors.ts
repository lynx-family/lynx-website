// Single source of truth for platform colors across the site.
//
// One hue per *brand family*, paired across light/dark so the row stays
// tonally even. Tailwind ~600 in light + ~400 in dark sits on the same
// perceived lightness, which is what lets the icons hum at the same volume.
//
// Brand mapping:
//   apple family ios and macos -> zinc       Apple system silver/space gray
//   android                    -> emerald    Android green
//   harmony                    -> rose       Huawei red, the brand cue
//   web and web_lynx           -> orange     Lynx-on-web warmth
//   windows                    -> sky        Microsoft blue
//   lynxtron                   -> red        Lynx brand color
//   clay umbrella and variants -> cyan       Clay/Desktop signature
//
// `clay_<platform>` reuses the underlying-platform icon glyph, so the color
// is the only thing keeping `ClayAndroidOnly` and `AndroidOnly` visually
// distinct. That's why every clay_* shares one Clay color rather than
// borrowing the underlying-platform color.

export type PlatformKey =
  | 'ios'
  | 'macos'
  | 'android'
  | 'harmony'
  | 'web'
  | 'web_lynx'
  | 'windows'
  | 'pc'
  | 'lynxtron'
  | 'clay'
  | 'clay_ios'
  | 'clay_android'
  | 'clay_macos'
  | 'clay_windows';

type PlatformHue = {
  // Tailwind class string for icon/text tinting (light: ~600, dark: ~400).
  tint: string;
  // Solid hex pair for inline styles and CSS-variable overrides.
  // light = Tailwind 600, dark = Tailwind 400.
  hex: { light: string; dark: string };
  // Subtle container background pair used by PlatformBadge.
  // light = Tailwind 50, dark = Tailwind 950 + 60% (mixed against bg by the
  // browser via alpha). Keeps the badge calm so the icon does the signalling.
  bg: { light: string; dark: string };
};

const APPLE_HUE: PlatformHue = {
  tint: 'text-zinc-700 dark:text-zinc-300',
  hex: { light: '#52525b', dark: '#d4d4d8' },
  bg: { light: '#fafafa', dark: '#27272a99' },
};

const ANDROID_HUE: PlatformHue = {
  tint: 'text-emerald-600 dark:text-emerald-400',
  hex: { light: '#059669', dark: '#34d399' },
  bg: { light: '#ecfdf5', dark: '#022c2299' },
};

const HARMONY_HUE: PlatformHue = {
  tint: 'text-rose-600 dark:text-rose-400',
  hex: { light: '#e11d48', dark: '#fb7185' },
  bg: { light: '#fff1f2', dark: '#4c051599' },
};

const WEB_HUE: PlatformHue = {
  tint: 'text-orange-600 dark:text-orange-400',
  hex: { light: '#ea580c', dark: '#fb923c' },
  bg: { light: '#fff7ed', dark: '#43140799' },
};

const WINDOWS_HUE: PlatformHue = {
  tint: 'text-sky-600 dark:text-sky-400',
  hex: { light: '#0284c7', dark: '#38bdf8' },
  bg: { light: '#f0f9ff', dark: '#082f4999' },
};

const LYNXTRON_HUE: PlatformHue = {
  tint: 'text-red-600 dark:text-red-400',
  hex: { light: '#ff351a', dark: '#ff6448' },
  bg: { light: '#fff1f2', dark: '#450a0a99' },
};

const CLAY_HUE: PlatformHue = {
  tint: 'text-cyan-600 dark:text-cyan-400',
  hex: { light: '#0891b2', dark: '#22d3ee' },
  bg: { light: '#ecfeff', dark: '#08344499' },
};

export const PLATFORM_HUES: Record<PlatformKey, PlatformHue> = {
  ios: APPLE_HUE,
  macos: APPLE_HUE,
  android: ANDROID_HUE,
  harmony: HARMONY_HUE,
  web: WEB_HUE,
  web_lynx: WEB_HUE,
  windows: WINDOWS_HUE,
  pc: WINDOWS_HUE,
  lynxtron: LYNXTRON_HUE,
  clay: CLAY_HUE,
  clay_ios: CLAY_HUE,
  clay_android: CLAY_HUE,
  clay_macos: CLAY_HUE,
  clay_windows: CLAY_HUE,
};

// Tailwind tint classes by platform key. Kept as a separate export because
// the homepage icon row only needs the tint string, not the full hue object.
export const PLATFORM_TINT: Record<PlatformKey, string> = Object.fromEntries(
  (Object.keys(PLATFORM_HUES) as PlatformKey[]).map((key) => [
    key,
    PLATFORM_HUES[key].tint,
  ]),
) as Record<PlatformKey, string>;
