/**
 * Satori templates for the "Gradient Flood" OG covers and blog images.
 * Layouts are left-aligned and editorial: full-bleed 120deg gradient, an
 * oversized faint watermark of the mark, the logo top-left, a bold headline
 * lower-left, and a footer. A bottom scrim guarantees white-text contrast
 * regardless of where the gradient lands.
 */
import { h, loadLogo, FONT_SANS, FONT_MONO, type Node } from './lib';
import { OG_BLOG_GRADIENT, type OgCover } from '../../shared-og-config';

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 72;

type CSS = Record<string, unknown>;

type RGB = [number, number, number];

function parseColor(c: string): RGB {
  const s = c.trim();
  if (s.startsWith('#')) {
    const hex =
      s.length === 4
        ? s
            .slice(1)
            .split('')
            .map((x) => x + x)
            .join('')
        : s.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return [r, g, b];
  }
  throw new Error(`Unsupported color: ${c}`);
}

const srgbToLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const linearToSrgb = (v: number) => {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, s)) * 255);
};
/** Cubic smoothstep — zero slope at t=0 and t=1. */
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Mix two colors in linear-light space with a smoothstep-eased parameter. */
function mix(a: RGB, b: RGB, t: number): string {
  const e = smoothstep(t);
  const ch = (i: number) =>
    linearToSrgb(
      srgbToLinear(a[i]) + (srgbToLinear(b[i]) - srgbToLinear(a[i])) * e,
    );
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

/**
 * Build a perceptually smooth multi-stop gradient from control colors.
 *
 * A plain `linear-gradient(A, bridge, C)` has a visible band at the bridge: the
 * color slope changes abruptly there and the eye exaggerates the kink (Mach
 * band). We resample each segment with a smoothstep ease — its slope is zero at
 * both ends, so adjacent segments meet with matching (zero) slope and the kink
 * disappears — and interpolate in linear-light RGB so midpoints stay luminous.
 */
function smoothGradient(stops: string[], angle = 120, perSegment = 14): string {
  const cols = stops.map(parseColor);
  const segments = cols.length - 1;
  const out: string[] = [];
  for (let s = 0; s < segments; s++) {
    const from = s / segments;
    const span = 1 / segments;
    for (let k = 0; k <= perSegment; k++) {
      if (s > 0 && k === 0) continue; // skip duplicate shared control point
      const t = k / perSegment;
      const pos = (from + span * t) * 100;
      out.push(`${mix(cols[s], cols[s + 1], t)} ${pos.toFixed(2)}%`);
    }
  }
  return `linear-gradient(${angle}deg, ${out.join(', ')})`;
}

/**
 * Full-bleed gradient root with overlays + content stacked bottom/top. Accepts
 * multi-stop gradients so covers can route through the lilac bridge (mirroring
 * the on-site hero title sweep), rendered smooth via `smoothGradient`.
 */
function frame(stops: string[], children: Node[]): Node {
  const root: CSS = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    padding: `${PAD}px`,
    backgroundColor: stops[0],
    backgroundImage: smoothGradient(stops, 120),
    fontFamily: FONT_SANS,
    color: '#ffffff',
  };
  return h('div', { style: root }, ...children);
}

const scrim = (): Node =>
  h('div', {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '70%',
      backgroundImage:
        'linear-gradient(180deg, rgba(8,6,20,0) 0%, rgba(8,6,20,0.32) 70%, rgba(8,6,20,0.5) 100%)',
    },
  });

const watermark = (logo: string): Node =>
  h('img', {
    src: logo,
    width: 600,
    height: 600,
    style: {
      position: 'absolute',
      right: '-110px',
      bottom: '-150px',
      opacity: 0.1,
    },
  });

const footer = (url: string, right?: string): Node =>
  h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '28px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.28)',
      },
    },
    h(
      'div',
      {
        style: {
          // URLs render in the monospace family.
          fontFamily: FONT_MONO,
          fontSize: '25px',
          fontWeight: 500,
          letterSpacing: '0px',
          color: 'rgba(255,255,255,0.9)',
        },
      },
      url,
    ),
    right
      ? h(
          'div',
          {
            style: {
              fontSize: '22px',
              fontWeight: 600,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.72)',
            },
          },
          right,
        )
      : null,
  );

const eyebrow = (text: string): Node =>
  h(
    'div',
    {
      style: {
        display: 'flex',
        // Center the glyphs both axes; lineHeight:1 stops uppercase caps from
        // sitting high in the pill. No alignSelf — let the header row's
        // alignItems:center vertically align the pill with the logo.
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '9px',
        paddingBottom: '9px',
        // letterSpacing adds 4px after the last glyph too; add it back on the
        // left so the text reads optically centered in the pill.
        paddingLeft: '24px',
        paddingRight: '20px',
        borderRadius: '999px',
        backgroundColor: 'rgba(255,255,255,0.16)',
        border: '1px solid rgba(255,255,255,0.3)',
        fontSize: '24px',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '4px',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.95)',
      },
    },
    text,
  );

/** Per-language subsite cover. Label is language-neutral; description localizes. */
export function coverTemplate(cover: OgCover, lang: 'en' | 'zh'): Node {
  const logo = loadLogo(cover.logo);
  const isZh = lang === 'zh';
  const description = isZh ? cover.descriptionZh : cover.description;
  // Footer URL hints at the (language-prefixed) subsite path. guide is the
  // root/Lynx site, so it stays bare. Display form omits the `/next` version
  // prefix for cleanliness.
  const langSeg = isZh ? '/zh' : '';
  const url =
    cover.value === 'guide'
      ? `lynxjs.org${langSeg}`
      : `lynxjs.org${langSeg}/${cover.value}`;
  const docLabel = isZh ? '文档' : 'Documentation';
  return frame(cover.gradient, [
    scrim(),
    watermark(logo),
    // Header: logo top-left.
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center' } },
      h('img', { src: logo, width: 88, height: 88 }),
    ),
    // Bottom block: headline + description + footer.
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h(
        'div',
        {
          style: {
            fontSize: '108px',
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: '-3px',
          },
        },
        cover.label,
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: '18px',
            fontSize: '44px',
            fontWeight: 400,
            lineHeight: 1.2,
            color: 'rgba(255,255,255,0.94)',
          },
        },
        description,
      ),
      footer(url, docLabel),
    ),
  ]);
}

export type BlogTemplateInput = {
  title: string;
  byline: string;
};

/** Unique per-post blog image. Uses the guide gradient. */
export function blogTemplate(
  { title, byline }: BlogTemplateInput,
  lang: 'en' | 'zh',
): Node {
  const logo = loadLogo('guide.png');
  const isZh = lang === 'zh';
  // Scale the headline down for longer titles so two lines always fit.
  const len = title.length;
  const titleSize = len <= 28 ? 76 : len <= 52 ? 64 : 54;
  return frame(OG_BLOG_GRADIENT, [
    scrim(),
    watermark(logo),
    // Header: Lynx mark + blog eyebrow.
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '24px' } },
      h('img', { src: logo, width: 72, height: 72 }),
      eyebrow(isZh ? '博客' : 'Blog'),
    ),
    // Bottom block: title (max 2 lines) + byline + footer.
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: `${titleSize}px`,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            lineClamp: 2,
          },
        },
        title,
      ),
      byline
        ? h(
            'div',
            {
              style: {
                display: 'flex',
                marginTop: '24px',
                fontSize: '32px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.92)',
              },
            },
            byline,
          )
        : null,
      footer(isZh ? 'lynxjs.org/zh/blog' : 'lynxjs.org/blog'),
    ),
  ]);
}
