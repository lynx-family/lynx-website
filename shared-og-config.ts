/**
 * Open Graph image configuration — the single source of truth shared by the
 * build-time generator (`scripts/og/*`, Node) and the theme OG-tag injector
 * (`theme/OgHead.tsx`, browser/SSG).
 *
 * Keep this module pure and isomorphic: no `node:` imports, no DOM access, so
 * it bundles cleanly into the client theme and runs under `tsx` at build time.
 *
 * OG images are generated entirely at build time (Option 1: "Gradient Flood")
 * and shipped as static assets from `docs/public/og/`:
 *   - one shared cover per subsite per language: `/og/covers/<lang>/<value>.png`
 *   - a unique image per blog post:              `/og/blog/<lang>/<slug>.png`
 */
import { SUBSITES_CONFIG } from './shared-route-config';
import versionJson from './docs/public/version.json';

/** Published site origin (no trailing slash). OG/canonical URLs are absolute. */
export const OG_SITE_ORIGIN = 'https://lynxjs.org';

/**
 * Site base path — derived from the same source as rspress.config.ts's
 * `base: \`/${versionJson.current_version}\``, so canonical/og:image URLs stay
 * correct if `current_version` changes (currently `/next`). Public asset and
 * canonical URLs are prefixed with this.
 */
export const OG_BASE = `/${versionJson.current_version}`;

/**
 * Brand anchors. Values match the home hero gradient in theme/home-layout-var.scss
 * (`--major-brand-color`, `--second-brand-color`) — slightly brighter than the
 * raw `theme/index.scss` `$` vars (e.g. second cyan `#12e5e5` vs `#00ebeb`).
 */
export const OG_MAJOR_BRAND = '#ff351a';
export const OG_SECOND_COLOR = '#12e5e5';

/**
 * The lilac bridge. The on-site hero title gradient (`.dynamic-text` /
 * `.brand-ani` in theme/hero-text.scss) never interpolates two brand colors
 * directly — it routes through `--gradient-brand-color` so the midpoint stays
 * luminous instead of passing through muddy grey. We reuse it as the middle
 * stop of every vibrant cover gradient.
 */
export const OG_GRADIENT_BRIDGE = 'rgb(239, 155, 255)';

export type OgCover = {
  /** Route segment / cover id, e.g. `react`, `api`. */
  value: string;
  label: string;
  description: string;
  descriptionZh: string;
  /** Linear-gradient stops applied at 120deg, in order. */
  gradient: string[];
  /** Committed logo asset filename under `scripts/og/assets/`. */
  logo: string;
};

/**
 * Per-cover gradient + logo. Gradients echo each subsite's on-site hero title
 * sweep (theme/hero-text.scss + theme/home-layout-var.scss): the two brand
 * endpoints with the lilac bridge between them.
 *   - guide:    red → lilac → cyan       (home `.dynamic-text`)
 *   - react:    teal → lilac → red       (`--major/--second-brand-color`)
 *   - rspeedy:  orange → lilac → red
 *   - lynxtron: green → lilac → red      (`subsite-theme(#47d78f)`)
 *
 * `ai` and `lynx-ui` have no on-site hero gradient; they follow the same
 * bridge pattern for cohesion. `api` (reference docs) deliberately breaks the
 * pattern — see API_COVER below.
 */
const COVER_EXTRAS: Record<string, Pick<OgCover, 'gradient' | 'logo'>> = {
  guide: {
    gradient: [OG_MAJOR_BRAND, OG_GRADIENT_BRIDGE, OG_SECOND_COLOR],
    logo: 'guide.png',
  },
  react: {
    gradient: ['#0185ad', OG_GRADIENT_BRIDGE, OG_MAJOR_BRAND],
    logo: 'react.png',
  },
  rspeedy: {
    gradient: ['#ff9a00', OG_GRADIENT_BRIDGE, OG_MAJOR_BRAND],
    logo: 'rspeedy.png',
  },
  ui: {
    gradient: ['#ff1a6e', OG_GRADIENT_BRIDGE, OG_MAJOR_BRAND],
    logo: 'lynx-ui.png',
  },
  ai: {
    gradient: ['#6457f6', OG_GRADIENT_BRIDGE, OG_MAJOR_BRAND],
    logo: 'ai.png',
  },
  lynxtron: {
    gradient: ['#47d78f', OG_GRADIENT_BRIDGE, OG_MAJOR_BRAND],
    logo: 'lynxtron.png',
  },
};

/**
 * `api` metadata. Deliberately NOT added to SUBSITES_CONFIG: doing so would
 * make `findSubsite()` (theme/index.tsx) match every `/api/*` route and switch
 * those pages to an `api` theme — a live behavior change beyond OG images.
 * Here it only feeds the shared `api` cover.
 *
 * Unlike the vibrant brand covers, the API cover uses a dark, cool charcoal
 * gradient (no brand red) — a deep near-black through a lifted blue-graphite
 * band — for a serious, geeky, "reference manual" / sci-fi vibe. White text and
 * the white Lynx mark pop on the dark field.
 */
const API_COVER: OgCover = {
  value: 'api',
  label: 'API',
  description: 'API Reference',
  descriptionZh: 'API 参考',
  gradient: ['#0a0d14', '#232c3f', '#10141c'],
  logo: 'api.png',
};

/**
 * Covers to generate, in stable order. Label/description are pulled from
 * SUBSITES_CONFIG (single source of truth for subsite info); `api` is appended.
 */
export const OG_COVERS: OgCover[] = [
  ...Object.entries(COVER_EXTRAS).map(([value, extra]): OgCover => {
    const sub = SUBSITES_CONFIG.find((s) => s.value === value);
    if (!sub)
      throw new Error(`OG cover "${value}" missing from SUBSITES_CONFIG`);
    return {
      value,
      label: sub.label,
      description: sub.description,
      descriptionZh: sub.descriptionZh,
      ...extra,
    };
  }),
  API_COVER,
];

/** Cover ids that correspond to a real route segment (everything except guide, the fallback). */
const SUBSITE_COVER_VALUES = OG_COVERS.map((c) => c.value).filter(
  (v) => v !== 'guide',
);

/** Blog gradient reuses the guide cover (red → lilac → cyan). */
export const OG_BLOG_GRADIENT: string[] = [
  OG_MAJOR_BRAND,
  OG_GRADIENT_BRIDGE,
  OG_SECOND_COLOR,
];

// ── URL helpers ─────────────────────────────────────────────────
/** Languages with their own generated images. */
export const OG_LANGS = ['en', 'zh'] as const;
/** Normalize an arbitrary lang code to a generated-image language. */
export const ogLang = (lang: string) => (lang === 'zh' ? 'zh' : 'en');

/** Base-relative cover URL, e.g. `/next/og/covers/en/react.png`. */
export const ogCoverPath = (lang: string, value: string) =>
  `${OG_BASE}/og/covers/${ogLang(lang)}/${value}.png`;
/** Base-relative blog image URL, e.g. `/next/og/blog/en/lynx-3-5.png`. */
export const ogBlogPath = (lang: string, slug: string) =>
  `${OG_BASE}/og/blog/${ogLang(lang)}/${slug}.png`;
/** Absolutize a base-relative path against the published origin. */
export const ogAbsolute = (path: string) => `${OG_SITE_ORIGIN}${path}`;

// ── Route → OG image selection ──────────────────────────────────
export type OgSelection =
  | { kind: 'blog'; lang: string; slug: string; imagePath: string }
  | { kind: 'cover'; value: string; imagePath: string };

/**
 * Deterministically select the OG image for a route. Pure: derived only from
 * the path + language so it matches what the generator emits.
 *
 * A leading `zh` segment is stripped before classifying. Precedence:
 *   1. blog   — a `blog` segment followed by a slug (the blog index is not a post)
 *   2. api    — first effective segment is `api`
 *   3. subsite — first segment matching a cover (react/rspeedy/ui/ai)
 *   4. guide  — fallback
 *
 * Examples (imagePath via ogBlogPath/ogCoverPath):
 *   `/blog/lynx-3-5`        → { kind: 'blog', slug: 'lynx-3-5' }
 *   `/api/hooks/useState`   → { kind: 'cover', value: 'api' }
 *   `/react/introduction`   → { kind: 'cover', value: 'react' }
 *   `/zh/guide/...` (zh)    → { kind: 'cover', value: 'guide' }
 *
 * @param pathnameNoBase  pathname with the site base already removed,
 *                        e.g. `/blog/lynx-3-5.html`, `/zh/api/index.html`,
 *                        `/react/introduction`.
 * @param lang            current language (`en` | `zh`).
 */
export function selectOg(pathnameNoBase: string, lang: string): OgSelection {
  const clean = pathnameNoBase.replace(/\.html$/, '').replace(/\/+$/, '');
  const segments = clean.split('/').filter(Boolean);
  // Drop a leading language segment so `/zh/api/...` classifies like `/api/...`.
  const afterLang = segments[0] === 'zh' ? segments.slice(1) : segments;

  // 1. Blog post: a `blog` segment with a slug after it (not the blog index).
  const blogIdx = afterLang.indexOf('blog');
  if (blogIdx !== -1 && afterLang.length > blogIdx + 1) {
    const slug = afterLang[afterLang.length - 1];
    return { kind: 'blog', lang, slug, imagePath: ogBlogPath(lang, slug) };
  }

  // 2. API documentation.
  if (afterLang[0] === 'api') {
    return { kind: 'cover', value: 'api', imagePath: ogCoverPath(lang, 'api') };
  }

  // 3. Subsite docs (react/rspeedy/ui/ai) — match the first effective segment
  // to a cover. Deeper segments must not count: /guide/ui/* is a guide page,
  // not a lynx-ui one.
  const value = SUBSITE_COVER_VALUES.find((v) => afterLang[0] === v);
  if (value)
    return { kind: 'cover', value, imagePath: ogCoverPath(lang, value) };

  // 4. Fallback to the guide cover.
  return {
    kind: 'cover',
    value: 'guide',
    imagePath: ogCoverPath(lang, 'guide'),
  };
}

/** Look up a cover's display metadata by value. */
export const getCover = (value: string) =>
  OG_COVERS.find((c) => c.value === value);
