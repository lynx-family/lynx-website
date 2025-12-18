import satori from 'satori';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type OGImageConfig = {
  /**
   * Title text for the OG image
   */
  title: string;
  /**
   * Subtitle or description (optional)
   */
  subtitle?: string;
  /**
   * Logo or brand identifier (optional)
   */
  logo?: string;
  /**
   * Background color or gradient
   */
  background?: string;
  /**
   * Text color
   */
  textColor?: string;
  /**
   * Shared image name - if provided, use this as the filename instead of route-based name
   * This allows multiple routes to share the same image
   */
  sharedImageName?: string;
};

type FontPair = { regular: ArrayBuffer; bold: ArrayBuffer };

// Cache for font data (so we don't re-read / re-download per image)
let interCache: FontPair | null = null;
let notoSansSCCache: FontPair | null = null;

// Check if text contains Chinese characters
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function getFontCacheDir(): string {
  // Keep downloaded font artifacts out of git and reuse across builds if node_modules is cached (e.g. Netlify)
  return path.join(process.cwd(), 'node_modules', '.cache', 'rspress-og-fonts');
}

async function fetchFontWithCache(url: string, cacheBasename: string) {
  const cacheDir = getFontCacheDir();
  const cachePath = path.join(cacheDir, cacheBasename);

  if (existsSync(cachePath)) {
    const cached = await fs.readFile(cachePath);
    return bufferToArrayBuffer(cached);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch font: ${url} (${res.status})`);
  }
  const ab = await res.arrayBuffer();
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cachePath, Buffer.from(ab));
  return ab;
}

async function readLocalFontOrFetch(
  url: string,
  cacheBasename: string,
  localPath?: string,
) {
  if (localPath && existsSync(localPath)) {
    const buf = await fs.readFile(localPath);
    return bufferToArrayBuffer(buf);
  }
  return fetchFontWithCache(url, cacheBasename);
}

async function getInterFonts(): Promise<FontPair> {
  if (interCache) return interCache;

  // Try local @fontsource first, else fetch just the specific files we need (woff2)
  const dirname = path.dirname(fileURLToPath(import.meta.url || ''));
  const interFilesDir = path.join(
    dirname,
    '..',
    'node_modules',
    '@fontsource',
    'inter',
    'files',
  );

  const interRegular = await readLocalFontOrFetch(
    'https://unpkg.com/@fontsource/inter/files/inter-latin-400-normal.woff2',
    'inter-latin-400-normal.woff2',
    // Prefer woff2, fallback to woff by letting localPath be the woff2 first
    existsSync(path.join(interFilesDir, 'inter-latin-400-normal.woff2'))
      ? path.join(interFilesDir, 'inter-latin-400-normal.woff2')
      : path.join(interFilesDir, 'inter-latin-400-normal.woff'),
  );
  const interBold = await readLocalFontOrFetch(
    'https://unpkg.com/@fontsource/inter/files/inter-latin-700-normal.woff2',
    'inter-latin-700-normal.woff2',
    existsSync(path.join(interFilesDir, 'inter-latin-700-normal.woff2'))
      ? path.join(interFilesDir, 'inter-latin-700-normal.woff2')
      : path.join(interFilesDir, 'inter-latin-700-normal.woff'),
  );

  interCache = { regular: interRegular, bold: interBold };
  return interCache;
}

async function getNotoSansSCFonts(): Promise<FontPair> {
  if (notoSansSCCache) return notoSansSCCache;

  // Prefer local @fontsource/noto-sans-sc if present, otherwise download only the needed subset (woff2)
  const dirname = path.dirname(fileURLToPath(import.meta.url || ''));
  const notoFilesDir = path.join(
    dirname,
    '..',
    'node_modules',
    '@fontsource',
    'noto-sans-sc',
    'files',
  );

  const regular = await readLocalFontOrFetch(
    'https://unpkg.com/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff2',
    'noto-sans-sc-chinese-simplified-400-normal.woff2',
    existsSync(
      path.join(
        notoFilesDir,
        'noto-sans-sc-chinese-simplified-400-normal.woff2',
      ),
    )
      ? path.join(
          notoFilesDir,
          'noto-sans-sc-chinese-simplified-400-normal.woff2',
        )
      : path.join(
          notoFilesDir,
          'noto-sans-sc-chinese-simplified-400-normal.woff',
        ),
  );

  const bold = await readLocalFontOrFetch(
    'https://unpkg.com/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff2',
    'noto-sans-sc-chinese-simplified-700-normal.woff2',
    existsSync(
      path.join(
        notoFilesDir,
        'noto-sans-sc-chinese-simplified-700-normal.woff2',
      ),
    )
      ? path.join(
          notoFilesDir,
          'noto-sans-sc-chinese-simplified-700-normal.woff2',
        )
      : path.join(
          notoFilesDir,
          'noto-sans-sc-chinese-simplified-700-normal.woff',
        ),
  );

  notoSansSCCache = { regular, bold };
  return notoSansSCCache;
}

/**
 * Generate an OG image using Satori and Sharp
 */
export async function generateOGImage(
  config: OGImageConfig,
  outputPath: string,
): Promise<void> {
  const {
    title,
    subtitle,
    logo = 'Lynx',
    background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor = '#ffffff',
  } = config;

  // Determine if we need Chinese fonts
  const needsChinese =
    containsChinese(title) ||
    (subtitle && containsChinese(subtitle)) ||
    containsChinese(logo);

  // Load fonts (only load Chinese font when needed)
  const inter = await getInterFonts();
  const notoSansSC = needsChinese ? await getNotoSansSCFonts() : null;

  // Choose font family based on content
  const fontFamily = needsChinese
    ? 'Noto Sans SC, Inter, sans-serif'
    : 'Inter, sans-serif';

  // Create JSX structure for Satori
  const element = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'flex-start',
        background,
        padding: '80px',
        fontFamily,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize: '48px',
              fontWeight: 700,
              color: textColor,
              marginBottom: '20px',
              opacity: 0.9,
            },
            children: logo,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: title.length > 50 ? '56px' : '72px',
              fontWeight: 700,
              color: textColor,
              lineHeight: 1.2,
              marginBottom: subtitle ? '20px' : '0',
              maxWidth: '1000px',
            },
            children: title,
          },
        },
        subtitle
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '32px',
                  fontWeight: 400,
                  color: textColor,
                  opacity: 0.8,
                  maxWidth: '900px',
                },
                children: subtitle,
              },
            }
          : null,
      ].filter(Boolean),
    },
  };

  // Prepare font list for Satori
  const satoriFonts = [
    {
      name: 'Inter',
      data: inter.regular,
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: inter.bold,
      weight: 700 as const,
      style: 'normal' as const,
    },
    ...(notoSansSC
      ? ([
          {
            name: 'Noto Sans SC',
            data: notoSansSC.regular,
            weight: 400 as const,
            style: 'normal' as const,
          },
          {
            name: 'Noto Sans SC',
            data: notoSansSC.bold,
            weight: 700 as const,
            style: 'normal' as const,
          },
        ] as const)
      : []),
  ];

  // Convert to SVG using Satori
  const svg = await satori(element as any, {
    width: 1200,
    height: 630,
    fonts: satoriFonts,
  });

  // Convert SVG to PNG using Sharp
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Write to file
  await fs.writeFile(outputPath, pngBuffer);
}
