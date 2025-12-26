import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

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
   * Logo or brand identifier (optional) - text logo
   */
  logo?: string;
  /**
   * Logo image URL or file path (optional) - if provided, this takes precedence over logo text
   * Supports: URLs (http/https), absolute paths, or paths relative to project root
   */
  logoImage?: string;
  /**
   * Logo image width in pixels (optional, default: auto based on height)
   */
  logoWidth?: number;
  /**
   * Logo image height in pixels (optional, default: 60)
   */
  logoHeight?: number;
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
  // Create a new ArrayBuffer to avoid SharedArrayBuffer type issues
  const ab = new ArrayBuffer(buf.byteLength);
  const view = new Uint8Array(ab);
  view.set(buf);
  return ab;
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

  // Try local @fontsource first, else fetch just the specific files we need (woff).
  // Note: Satori doesn't support woff2 (wOF2 signature). Use woff for broad compatibility.
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
    'https://unpkg.com/@fontsource/inter/files/inter-latin-400-normal.woff',
    'inter-latin-400-normal.woff',
    path.join(interFilesDir, 'inter-latin-400-normal.woff'),
  );
  const interBold = await readLocalFontOrFetch(
    'https://unpkg.com/@fontsource/inter/files/inter-latin-700-normal.woff',
    'inter-latin-700-normal.woff',
    path.join(interFilesDir, 'inter-latin-700-normal.woff'),
  );

  interCache = { regular: interRegular, bold: interBold };
  return interCache;
}

async function getNotoSansSCFonts(): Promise<FontPair> {
  if (notoSansSCCache) return notoSansSCCache;

  // Prefer local @fontsource/noto-sans-sc if present, otherwise download only the needed subset (woff).
  // Note: Satori doesn't support woff2 (wOF2 signature). Use woff for broad compatibility.
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
    'https://unpkg.com/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff',
    'noto-sans-sc-chinese-simplified-400-normal.woff',
    existsSync(
      path.join(
        notoFilesDir,
        'noto-sans-sc-chinese-simplified-400-normal.woff',
      ),
    )
      ? path.join(
          notoFilesDir,
          'noto-sans-sc-chinese-simplified-400-normal.woff',
        )
      : path.join(notoFilesDir, 'noto-sans-sc-chinese-simplified-400-normal.woff'),
  );

  const bold = await readLocalFontOrFetch(
    'https://unpkg.com/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff',
    'noto-sans-sc-chinese-simplified-700-normal.woff',
    existsSync(
      path.join(
        notoFilesDir,
        'noto-sans-sc-chinese-simplified-700-normal.woff',
      ),
    )
      ? path.join(
          notoFilesDir,
          'noto-sans-sc-chinese-simplified-700-normal.woff',
        )
      : path.join(notoFilesDir, 'noto-sans-sc-chinese-simplified-700-normal.woff'),
  );

  notoSansSCCache = { regular, bold };
  return notoSansSCCache;
}

/**
 * Load an image from URL or file path and convert to data URL
 * Handles both SVG and raster formats (PNG, JPEG, etc.)
 */
type LoadedImage = {
  dataUrl: string;
  /**
   * width / height
   */
  aspectRatio?: number;
};

function getSvgAspectRatio(svgText: string): number | undefined {
  // Prefer viewBox if present: viewBox="minX minY width height"
  const viewBoxMatch = svgText.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4) {
      const w = parts[2];
      const h = parts[3];
      if (Number.isFinite(w) && Number.isFinite(h) && h !== 0) return w / h;
    }
  }

  // Fallback: width="27" height="28"
  const widthMatch = svgText.match(/width\s*=\s*"([\d.]+)"/i);
  const heightMatch = svgText.match(/height\s*=\s*"([\d.]+)"/i);
  if (widthMatch && heightMatch) {
    const w = Number(widthMatch[1]);
    const h = Number(heightMatch[1]);
    if (Number.isFinite(w) && Number.isFinite(h) && h !== 0) return w / h;
  }

  return undefined;
}

async function loadImageAsDataUrl(
  imagePathOrUrl: string,
  options?: {
    /**
     * Desired display size in the final OG image (in px). Used to rasterize SVGs at a high-enough resolution.
     */
    targetWidth?: number;
    targetHeight?: number;
    /**
     * Supersampling factor when rasterizing SVGs (default: 4).
     */
    rasterScale?: number;
  },
): Promise<LoadedImage> {
  let imageBuffer: Buffer;

  // Check if it's a URL
  if (
    imagePathOrUrl.startsWith('http://') ||
    imagePathOrUrl.startsWith('https://')
  ) {
    const response = await fetch(imagePathOrUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${imagePathOrUrl} (${response.status})`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } else {
    // It's a file path - resolve relative to project root
    const cwd = process.cwd();
    const resolvedPath = path.isAbsolute(imagePathOrUrl)
      ? imagePathOrUrl
      : path.join(cwd, imagePathOrUrl);

    if (!existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }
    imageBuffer = await fs.readFile(resolvedPath);
  }

  // Determine MIME type from file extension or buffer
  const ext = path.extname(imagePathOrUrl).toLowerCase();
  let mimeType: string;
  let aspectRatio: number | undefined;

  if (
    ext === '.svg' ||
    imageBuffer.toString('utf-8').trimStart().startsWith('<svg')
  ) {
    const svgText = imageBuffer.toString('utf-8');
    aspectRatio = getSvgAspectRatio(svgText);

    // SVG - convert to a *high-res* PNG (so it stays crisp when placed at ~50px+)
    const rasterScale = options?.rasterScale ?? 4;
    const targetHeight = Math.max(1, Math.round((options?.targetHeight ?? 60) * rasterScale));
    const targetWidth = Math.max(
      1,
      Math.round(
        (options?.targetWidth ??
          (aspectRatio ? (options?.targetHeight ?? 60) * aspectRatio : options?.targetHeight ?? 60)) *
          rasterScale,
      ),
    );

    // `density` helps sharp render SVGs with enough detail before rasterization.
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
    const pngBuffer = await sharp(imageBuffer, { density: 300 })
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: transparent,
      })
      // Make sure alpha is preserved and avoid edge artifacts from premultiply defaults
      .png({ force: true })
      .toBuffer();
    mimeType = 'image/png';
    imageBuffer = pngBuffer;
  } else if (ext === '.png') {
    mimeType = 'image/png';
  } else if (ext === '.jpg' || ext === '.jpeg') {
    mimeType = 'image/jpeg';
  } else {
    // Try to detect from buffer or default to PNG
    mimeType = 'image/png';
  }

  // Convert to base64 data URL
  const base64 = imageBuffer.toString('base64');
  return { dataUrl: `data:${mimeType};base64,${base64}`, aspectRatio };
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
    logoImage,
    logoWidth,
    logoHeight = 60,
    background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor = '#ffffff',
  } = config;

  // Load logo image if provided
  let logoDataUrl: string | null = null;
  let logoAspectRatio: number | undefined;
  if (logoImage) {
    try {
      const loaded = await loadImageAsDataUrl(logoImage, {
        targetWidth: logoWidth,
        targetHeight: logoHeight,
        rasterScale: 4,
      });
      logoDataUrl = loaded.dataUrl;
      logoAspectRatio = loaded.aspectRatio;
    } catch (error) {
      console.warn(`Failed to load logo image ${logoImage}:`, error);
      // Fall back to text logo
    }
  }

  // Determine if we need Chinese fonts
  const needsChinese =
    containsChinese(title) ||
    (subtitle && containsChinese(subtitle)) ||
    (!logoDataUrl && containsChinese(logo));

  // Load fonts (only load Chinese font when needed)
  const inter = await getInterFonts();
  const notoSansSC = needsChinese ? await getNotoSansSCFonts() : null;

  // Choose font family based on content
  const fontFamily = needsChinese
    ? 'Noto Sans SC, Inter, sans-serif'
    : 'Inter, sans-serif';

  // Create logo element (image or text)
  // Prefer <img> with a data: URL (PNG) for reliability across Satori renderers.
  const logoElement = logoDataUrl
    ? {
        type: 'img',
        props: {
          src: logoDataUrl,
          style: {
            width: `${logoWidth ?? Math.round(logoHeight * (logoAspectRatio || 1))}px`,
            height: `${logoHeight}px`,
            objectFit: 'contain',
            marginBottom: '20px',
            opacity: 0.9,
          },
        },
      }
    : {
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
      };

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
        logoElement,
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
