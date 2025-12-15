import satori from 'satori';
import sharp from 'sharp';
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
};

// Cache for font data
let fontDataCache: {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
} | null = null;

async function getFontData(): Promise<{
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}> {
  if (fontDataCache) {
    return fontDataCache;
  }

  try {
    // Try to use fontsource Inter package
    const dirname = path.dirname(fileURLToPath(import.meta.url || ''));
    const fontsourcePath = path.join(
      dirname,
      '..',
      'node_modules',
      '@fontsource',
      'inter',
      'files',
    );

    // Load regular and bold weights
    const regularPath = path.join(
      fontsourcePath,
      'inter-latin-400-normal.woff',
    );
    const boldPath = path.join(fontsourcePath, 'inter-latin-700-normal.woff');

    const [regular, bold] = await Promise.all([
      fs.readFile(regularPath),
      fs.readFile(boldPath),
    ]);

    fontDataCache = {
      regular: regular.buffer,
      bold: bold.buffer,
    };

    return fontDataCache;
  } catch (error) {
    console.error('Failed to load fonts from @fontsource/inter:', error);

    // Fallback: try to fetch from CDN
    try {
      const [regularRes, boldRes] = await Promise.all([
        fetch(
          'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff',
        ),
        fetch(
          'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff',
        ),
      ]);

      fontDataCache = {
        regular: await regularRes.arrayBuffer(),
        bold: await boldRes.arrayBuffer(),
      };

      return fontDataCache;
    } catch (fetchError) {
      // Last fallback: return minimal data but this will fail in Satori
      throw new Error(
        'Could not load fonts. Please ensure @fontsource/inter is installed or internet is available.',
      );
    }
  }
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

  // Load fonts
  const fonts = await getFontData();

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
        fontFamily: 'Inter, sans-serif',
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

  // Convert to SVG using Satori
  const svg = await satori(element as any, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: fonts.regular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: fonts.bold,
        weight: 700,
        style: 'normal',
      },
    ],
  });

  // Convert SVG to PNG using Sharp
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Write to file
  await fs.writeFile(outputPath, pngBuffer);
}
