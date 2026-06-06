# OG image generation (build-time)

Generates Open Graph images entirely at build time — no runtime endpoint. Style
is "Gradient Flood": a full-bleed brand gradient per subsite, white logo, bold
headline. See `shared-og-config.ts` (repo root) for the single source of truth
shared with the theme.

## Outputs (`docs/public/og/`, git-ignored, regenerated each build)

- `covers/<lang>/<subsite>.png` — one shared cover per subsite (`guide`, `react`,
  `rspeedy`, `lynx-ui`, `ai`, `api`) per language (`en`/`zh`), reused across
  every URL in that subsite+language. Label is language-neutral; the description,
  footer URL, and "Documentation/文档" label localize.
- `blog/<lang>/<slug>.png` — a unique image per blog post (en + zh).

Each image has a `<name>.png.meta.json` sidecar holding a hash of its inputs;
unchanged images are skipped on the next run. Bump `TEMPLATE_VERSION` in
`generate.ts` to force a full regen after a layout change.

## Pipeline

`satori` renders JSX-like templates → SVG, `@resvg/resvg-js` rasterizes → PNG.
Fonts are bundled locally (no network at build time).

## Commands

```bash
pnpm gen:og              # generate covers + blog images
pnpm gen:og -- --force   # ignore the cache and regenerate everything
pnpm gen:og:assets       # re-fetch + rasterize the vendored logos (rarely)
```

`gen:og` runs automatically before `rspress build` (see `package.json` and
`netlify.toml`).

## Vendored binaries (committed)

- `fonts/` — Inter (Latin; matches the site's `--rp-font-family-base`, fontsource
  static TTF), JetBrains Mono (URLs), Noto Sans (Latin fallback) and Noto Sans SC
  (CJK, from notofonts/noto-cjk SubsetOTF — required for Chinese blog titles).
  satori needs raw `ttf`/`otf` (not `woff2`).
- `assets/<subsite>.png` — each subsite's logo, pre-rasterized to a uniform
  white silhouette so it reads on the gradient. Exceptions keep their native
  colors (`native: true`): the two-tone lynx-ui hex and the detailed Rspeedy
  crab mascot, which a flat silhouette would reduce to a featureless blob.
  Produced by `prepare-assets.mjs` from the `logo.dark` artwork in
  `shared-route-config.ts`; committed so the build stays offline.

## OG meta tags

Injected per-page by the theme (`theme/OgHead.tsx`) using the deterministic
`selectOg()` route classifier — not by a global plugin — so each route gets its
own `og:image` and canonical URL with no duplicate tags.
