// @ts-check
/**
 * One-time (re-runnable) preparation of OG logo assets.
 *
 * Subsite logos in `shared-route-config.ts` are a mix of remote CDN SVGs/PNGs
 * and local SVGs. Fetching them during `gen:og` would make the build
 * network-dependent (the spec forbids this), so we rasterize them **once** into
 * committed PNGs under `scripts/og/assets/<value>.png`. The OG generator then
 * reads only these local files.
 *
 * We use each subsite's dark-mode logo variant (`logo.dark`), i.e. the
 * light/white artwork meant for dark surfaces — it reads best on the saturated
 * cover gradients. Logos are normalized to a uniform white so every cover has a
 * consistent, legible brand mark regardless of the source artwork's own fills.
 *
 * Run with:  node scripts/og/prepare-assets.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const ASSETS_DIR = join(__dirname, 'assets');
const PUBLIC_ASSETS = join(REPO_ROOT, 'docs', 'public', 'assets');

const CDN =
  'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets';

/**
 * Logo sources, keyed by OG cover value. We pull the `logo.dark` artwork
 * (light-on-dark) for each subsite. `api` reuses the Lynx brand mark.
 * `native: true` keeps the source artwork's own colors (used for the two-tone
 * lynx-ui mark, whose inner cut-out reads on the gradient); otherwise the mark
 * is flattened to white.
 * @type {Record<string, { remoteSvg?: string; localSvg?: string; remotePng?: string; native?: boolean }>}
 */
const SOURCES = {
  guide: { remoteSvg: `${CDN}/lynx-light-logo.svg` },
  react: { remoteSvg: `${CDN}/reactlynx-logo-dark.svg` },
  // The Rspeedy crab is a detailed colored mascot — flattening it to a white
  // silhouette loses all its internal detail, so keep its native colors.
  rspeedy: { remotePng: `${CDN}/rspeedy.PNG`, native: true },
  ui: {
    localSvg: join(PUBLIC_ASSETS, 'lynx-ui-icon-light.svg'),
    native: true,
  },
  ai: { localSvg: join(PUBLIC_ASSETS, 'lynxai-logo-dark.svg') },
  lynxtron: {
    localSvg: join(PUBLIC_ASSETS, 'lynxtron', 'lynxtron-icon-dark.svg'),
  },
  api: { remoteSvg: `${CDN}/lynx-light-logo.svg` },
};

/** Target rasterization width (px); icons are square-ish so this keeps them crisp. */
const LOGO_WIDTH = 256;

/**
 * Force every painted shape in an SVG to a single flat color so the mark reads
 * uniformly on the gradient. Replaces explicit `fill="..."`/`stroke="..."`
 * color values and injects a default fill for shapes that rely on inheritance.
 * @param {string} svg
 * @param {string} color
 */
function recolorSvg(svg, color) {
  let out = svg
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`);
  // Ensure a root default fill so inherited/unspecified fills become `color`.
  out = out.replace(/<svg\b([^>]*)>/, (m, attrs) =>
    /\bfill="/.test(attrs) ? m : `<svg${attrs} fill="${color}">`,
  );
  return out;
}

/** @param {string} svg */
function rasterizeSvg(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: LOGO_WIDTH },
    background: 'rgba(0,0,0,0)',
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

/**
 * Flatten a raster logo to a uniform white silhouette (preserving alpha) by
 * wrapping it in an SVG and forcing RGB→1 via feColorMatrix. Used for logos
 * only available as colored PNGs (e.g. Rspeedy), so every cover mark is a
 * consistent monochrome silhouette on the gradient.
 * @param {Buffer} png
 */
function rasterizePngAsWhite(png) {
  const href = `data:image/png;base64,${png.toString('base64')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_WIDTH}" height="${LOGO_WIDTH}" viewBox="0 0 ${LOGO_WIDTH} ${LOGO_WIDTH}">
    <filter id="white"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
    <image href="${href}" width="${LOGO_WIDTH}" height="${LOGO_WIDTH}" preserveAspectRatio="xMidYMid meet" filter="url(#white)"/>
  </svg>`;
  return rasterizeSvg(svg);
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}
async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  mkdirSync(ASSETS_DIR, { recursive: true });

  for (const [value, src] of Object.entries(SOURCES)) {
    const out = join(ASSETS_DIR, `${value}.png`);
    try {
      const provided = [src.remotePng, src.localSvg, src.remoteSvg].filter(
        Boolean,
      );
      if (provided.length !== 1) {
        throw new Error(
          `expected exactly one source (remotePng|localSvg|remoteSvg), got ${provided.length}`,
        );
      }
      if (src.remotePng) {
        const png = await fetchBytes(src.remotePng);
        writeFileSync(out, src.native ? png : rasterizePngAsWhite(png));
      } else {
        let svg = src.localSvg
          ? readFileSync(src.localSvg, 'utf8')
          : await fetchText(/** @type {string} */ (src.remoteSvg));
        if (!src.native) svg = recolorSvg(svg, '#ffffff');
        writeFileSync(out, rasterizeSvg(svg));
      }
      console.log(`✓ ${value}.png`);
    } catch (err) {
      console.error(`✗ ${value}: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }
}

main();
