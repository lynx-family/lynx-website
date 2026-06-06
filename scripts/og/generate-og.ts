import { Resvg } from '@resvg/resvg-js';
import matter from 'gray-matter';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { CORE_SUBSITES, type SubsiteConfig } from '../../shared-route-config';

type FontSpec = {
  name: string;
  weight: 400 | 700 | 800;
  data: ArrayBuffer;
  style: 'normal';
};

const SITE_ORIGIN = 'https://lynxjs.org';
const SITE_BASE = '/next';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(process.cwd(), 'docs');
const PUBLIC_DIR = path.join(DOCS_DIR, 'public');
const TEMPLATE_VERSION = '6';
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const COLORS = {
  major: '#ff351a',
  second: '#00ebeb',
  react: '#42b8d2',
  rspeedy: '#ff8b00',
  ai: '#7c3aed',
  api: '#0078fd',
  brand: '#ef9bff',
  text: '#f8fafc',
  textMuted: 'rgba(248, 250, 252, 0.78)',
} as const;
const API_SUBSITE_CONFIG: SubsiteConfig = {
  value: 'api',
  label: 'API',
  description: 'API reference',
  descriptionZh: 'API 参考',
  home: '/api/',
  url: '/api/',
  logo: {
    light:
      'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-dark-logo.svg',
    dark: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-light-logo.svg',
  },
};
const OG_SUBSITES_CONFIG = [...CORE_SUBSITES, API_SUBSITE_CONFIG];

function getHash(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function clampText(input: string, maxChars: number) {
  const text = input.trim().replace(/\s+/g, ' ');
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function findHeadingTitle(mdx: string) {
  const match = mdx.match(/^\s*#\s+(.+?)\s*$/m);
  return match?.[1]?.trim() || null;
}

function formatDate(dateString: string, lang: 'en' | 'zh') {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: lang === 'zh' ? 'long' : 'short',
    day: '2-digit',
  }).format(date);
}

function getGradientForSubsite(value: string) {
  switch (value) {
    case 'react':
    case 'lynx-ui':
    case 'reactlynx-use':
      return `linear-gradient(120deg, ${COLORS.react}, ${COLORS.brand}, ${COLORS.major})`;
    case 'rspeedy':
      return `linear-gradient(120deg, ${COLORS.rspeedy}, ${COLORS.brand}, ${COLORS.major})`;
    case 'ai':
      return `linear-gradient(120deg, ${COLORS.ai}, ${COLORS.brand}, ${COLORS.major})`;
    case 'api':
      return `linear-gradient(120deg, ${COLORS.api}, ${COLORS.brand}, ${COLORS.major})`;
    default:
      return `linear-gradient(120deg, ${COLORS.major}, ${COLORS.brand}, ${COLORS.second})`;
  }
}

async function loadFonts(): Promise<FontSpec[]> {
  const fontsDir = path.join(SCRIPT_DIR, 'fonts');
  const load = async (file: string, name: string, weight: 400 | 700 | 800) => {
    const buf = await fs.readFile(path.join(fontsDir, file));
    const copy = new Uint8Array(buf.byteLength);
    copy.set(buf);
    return {
      name,
      data: copy.buffer,
      weight,
      style: 'normal' as const,
    };
  };

  return Promise.all([
    load('Inter-Regular.woff', 'Inter', 400),
    load('Inter-Bold.woff', 'Inter', 700),
    load('Inter-ExtraBold.woff', 'Inter', 800),
    load('JetBrainsMono-Regular.woff', 'JetBrains Mono', 400),
    load('NotoSansSC-Regular.otf', 'Noto Sans SC', 400),
    load('NotoSansSC-Bold.otf', 'Noto Sans SC', 700),
  ]);
}

function getMimeType(filePath: string) {
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png') || filePath.endsWith('.PNG'))
    return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg'))
    return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

async function logoToDataUri(url: string) {
  let buffer: Buffer;
  let filePath = url;
  if (/^https?:\/\//.test(url)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${url}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
  } else {
    const normalized = url.startsWith('/') ? url.slice(1) : url;
    filePath = path.join(PUBLIC_DIR, normalized);
    buffer = await fs.readFile(filePath);
  }
  return `data:${getMimeType(filePath)};base64,${buffer.toString('base64')}`;
}

async function getLogosMap() {
  const map = new Map<string, string>();
  for (const subsite of OG_SUBSITES_CONFIG) {
    try {
      map.set(subsite.value, await logoToDataUri(subsite.logo.dark));
    } catch {
      continue;
    }
  }
  return map;
}

function h(
  type: string,
  props: Record<string, unknown>,
  ...children: unknown[]
) {
  const normalizedChildren = children.flat().filter(Boolean);
  return {
    type,
    props: {
      ...props,
      children:
        normalizedChildren.length === 0
          ? undefined
          : normalizedChildren.length === 1
            ? normalizedChildren[0]
            : normalizedChildren,
    },
  };
}

function coverTemplate(opts: {
  lang: 'en' | 'zh';
  label: string;
  description: string;
  gradient: string;
  logoDataUri?: string;
}) {
  const fontFamily = opts.lang === 'zh' ? 'Noto Sans SC, Inter' : 'Inter';
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '58px',
        background: opts.gradient,
        color: COLORS.text,
        fontFamily,
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        opts.logoDataUri
          ? h('img', {
              src: opts.logoDataUri,
              width: 64,
              height: 64,
              style: { objectFit: 'contain' },
            })
          : null,
        h('div', { style: { fontSize: 28, fontWeight: 700 } }, 'Lynx'),
      ),
      h(
        'div',
        {
          style: {
            fontSize: 18,
            fontFamily: 'JetBrains Mono',
            padding: '10px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(15, 23, 42, 0.18)',
          },
        },
        opts.lang === 'zh' ? '文档' : 'DOCS',
      ),
    ),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
      h(
        'div',
        {
          style: {
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.05em',
          },
        },
        clampText(opts.label, 24),
      ),
      h(
        'div',
        {
          style: {
            maxWidth: 880,
            fontSize: 34,
            lineHeight: 1.3,
            color: COLORS.textMuted,
          },
        },
        clampText(opts.description, 72),
      ),
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 18,
          color: 'rgba(248, 250, 252, 0.72)',
        },
      },
      h('div', {}, SITE_ORIGIN.replace('https://', '')),
      h(
        'div',
        { style: { fontFamily: 'JetBrains Mono' } },
        opts.lang.toUpperCase(),
      ),
    ),
  );
}

function blogTemplate(opts: {
  lang: 'en' | 'zh';
  title: string;
  description: string;
  date: string;
  logoDataUri?: string;
}) {
  const fontFamily = opts.lang === 'zh' ? 'Noto Sans SC, Inter' : 'Inter';
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '58px',
        background:
          'linear-gradient(135deg, #0f172a 0%, #111827 45%, rgba(255,53,26,0.9) 100%)',
        color: COLORS.text,
        fontFamily,
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        opts.logoDataUri
          ? h('img', {
              src: opts.logoDataUri,
              width: 56,
              height: 56,
              style: { objectFit: 'contain' },
            })
          : null,
        h('div', { style: { fontSize: 26, fontWeight: 700 } }, 'Lynx Blog'),
      ),
      h(
        'div',
        {
          style: {
            fontSize: 18,
            fontFamily: 'JetBrains Mono',
            color: COLORS.textMuted,
          },
        },
        opts.date,
      ),
    ),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
      h(
        'div',
        {
          style: {
            maxWidth: 1020,
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.08,
          },
        },
        clampText(opts.title, 72),
      ),
      h(
        'div',
        {
          style: {
            maxWidth: 980,
            fontSize: 30,
            lineHeight: 1.35,
            color: COLORS.textMuted,
          },
        },
        clampText(opts.description || 'Unlock Native for More', 150),
      ),
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 18,
          color: 'rgba(248, 250, 252, 0.72)',
        },
      },
      h('div', {}, SITE_ORIGIN.replace('https://', '')),
      h(
        'div',
        { style: { fontFamily: 'JetBrains Mono' } },
        opts.lang.toUpperCase(),
      ),
    ),
  );
}

async function renderPng(element: unknown, fonts: FontSpec[]) {
  const svg = await satori(element as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });
  return Buffer.from(new Resvg(svg).render().asPng());
}

async function writeWithCache(
  outputPath: string,
  hashInput: string,
  render: () => Promise<Buffer>,
) {
  const metaPath = `${outputPath}.meta.json`;
  const hash = getHash(`${TEMPLATE_VERSION}:${hashInput}`);
  if ((await pathExists(outputPath)) && (await pathExists(metaPath))) {
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      if (meta.hash === hash) {
        return;
      }
    } catch {}
  }
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, await render());
  await fs.writeFile(metaPath, JSON.stringify({ hash }));
}

async function generateCovers(fonts: FontSpec[]) {
  const logosMap = await getLogosMap();
  for (const subsite of OG_SUBSITES_CONFIG) {
    for (const lang of ['en', 'zh'] as const) {
      const description =
        lang === 'zh' ? subsite.descriptionZh : subsite.description;
      const outputPath = path.join(
        DOCS_DIR,
        'public',
        'og',
        'covers',
        lang,
        `${subsite.value}.png`,
      );
      await writeWithCache(
        outputPath,
        JSON.stringify({ subsite: subsite.value, lang, description }),
        () =>
          renderPng(
            coverTemplate({
              lang,
              label: subsite.label,
              description,
              gradient: getGradientForSubsite(subsite.value),
              logoDataUri: logosMap.get(subsite.value),
            }),
            fonts,
          ),
      );
    }
  }
}

async function generateBlogImages(fonts: FontSpec[]) {
  const logosMap = await getLogosMap();
  const guideLogo = logosMap.get('guide');
  for (const lang of ['en', 'zh'] as const) {
    const blogDir = path.join(DOCS_DIR, lang, 'blog');
    if (!(await pathExists(blogDir))) continue;
    const files = (await fs.readdir(blogDir))
      .filter((name) => name.endsWith('.md') || name.endsWith('.mdx'))
      .filter((name) => name !== 'index.mdx' && name !== 'index.md')
      .sort();
    for (const file of files) {
      const source = await fs.readFile(path.join(blogDir, file), 'utf-8');
      const { data, content } = matter(source);
      const title =
        typeof data.title === 'string' && data.title.trim()
          ? data.title.trim()
          : findHeadingTitle(content) || 'Lynx';
      const description =
        typeof data.description === 'string' ? data.description : '';
      const date =
        typeof data.date === 'string' ? formatDate(data.date, lang) : '';
      const outputPath = path.join(
        DOCS_DIR,
        'public',
        'og',
        'blog',
        lang,
        `${file.replace(/\.mdx?$/, '')}.png`,
      );
      await writeWithCache(
        outputPath,
        JSON.stringify({ file, lang, title, description, date }),
        () =>
          renderPng(
            blogTemplate({
              lang,
              title,
              description,
              date,
              logoDataUri: guideLogo,
            }),
            fonts,
          ),
      );
    }
  }
}

async function main() {
  const fonts = await loadFonts();
  await generateCovers(fonts);
  await generateBlogImages(fonts);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
