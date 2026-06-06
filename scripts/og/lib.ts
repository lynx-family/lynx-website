/**
 * Rendering primitives for the OG image generator: font loading, a tiny
 * hyperscript helper (so templates need no JSX/build config), the
 * satori → resvg rasterization pipeline, and local logo loading.
 *
 * satori renders text to vector <path>s, so resvg needs no fonts of its own.
 */
import satori, { type Font } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, 'fonts');
const ASSETS_DIR = join(__dirname, 'assets');

/**
 * Bundled, offline fonts. Latin is Inter — the site's own base typeface
 * (`--rp-font-family-base: "Inter var …"` in the rspress theme) — so OG images
 * read as the same brand as the website. URLs use JetBrains Mono. Noto Sans is
 * a Latin fallback for glyphs Inter's subset lacks, and Noto Sans SC covers CJK
 * (Chinese blog titles / descriptions).
 *
 * Family order matters: satori resolves each glyph against the listed families
 * left-to-right, so the first family that has the glyph wins.
 */
export const FONT_SANS = '"Inter", "Noto Sans", "Noto Sans SC"';
/** Monospace family for rendering URLs. */
export const FONT_MONO = '"JetBrains Mono", "Noto Sans SC"';

const font = (name: string, file: string, weight: Font['weight']): Font => ({
  name,
  data: readFileSync(join(FONTS_DIR, file)),
  weight,
  style: 'normal',
});

const FONTS: Font[] = [
  font('Inter', 'Inter-Regular.ttf', 400),
  font('Inter', 'Inter-Medium.ttf', 500),
  font('Inter', 'Inter-Bold.ttf', 700),
  font('JetBrains Mono', 'JetBrainsMono-Regular.ttf', 400),
  font('JetBrains Mono', 'JetBrainsMono-Medium.ttf', 500),
  font('Noto Sans', 'NotoSans-Regular.ttf', 400),
  font('Noto Sans', 'NotoSans-Bold.ttf', 700),
  font('Noto Sans SC', 'NotoSansSC-Regular.otf', 400),
  font('Noto Sans SC', 'NotoSansSC-Bold.otf', 700),
];

/** A satori-compatible virtual node (`{ type, props }`). */
export type Node = {
  type: string;
  props: Record<string, unknown> & { children?: unknown };
};

type Child = Node | string | number | null | undefined | false;

/** Minimal hyperscript: `h('div', { style }, ...children)`. */
export function h(
  type: string,
  props: Record<string, unknown> = {},
  ...children: Child[]
): Node {
  const flat = children
    .flat(Infinity as 1)
    .filter((c): c is Node | string | number => c != null && c !== false);
  // Omit `children` entirely when empty — satori mishandles an empty array and
  // reports a spurious "more than one child" error.
  const childProp =
    flat.length === 0 ? undefined : flat.length === 1 ? flat[0] : flat;
  return { type, props: { ...props, children: childProp } };
}

/** Read a committed logo PNG (`scripts/og/assets/<file>`) as a data URI. */
export function loadLogo(file: string): string {
  const buf = readFileSync(join(ASSETS_DIR, file));
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/** Render a virtual node to a PNG buffer at the given canvas size. */
export async function renderPng(
  node: Node,
  width = 1200,
  height = 630,
): Promise<Buffer> {
  // satori's typings expect a ReactNode; our `{ type, props }` shape is
  // accepted at runtime (satori reads it structurally).
  const svg = await satori(node as never, { width, height, fonts: FONTS });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  return png;
}
