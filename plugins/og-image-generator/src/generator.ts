import satori from 'satori';
import sharp from 'sharp';
import fs from 'node:fs/promises';

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

// Fetch font data (using a public CDN for simplicity)
let fontDataCache: ArrayBuffer | null = null;

async function getFontData(): Promise<ArrayBuffer> {
  if (fontDataCache) {
    return fontDataCache;
  }

  try {
    // Try to fetch Inter font from Google Fonts
    const response = await fetch(
      'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
    );
    fontDataCache = await response.arrayBuffer();
    return fontDataCache;
  } catch (error) {
    // If fetch fails, return empty array - Satori will use default font
    console.warn('Failed to load font, using fallback');
    // Return a minimal valid font or empty buffer
    return new ArrayBuffer(0);
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

  // Load font
  const fontData = await getFontData();

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
              fontWeight: '700',
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
              fontWeight: '700',
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
                  fontWeight: '400',
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
    fonts:
      fontData.byteLength > 0
        ? [
            {
              name: 'Inter',
              data: fontData,
              weight: 400,
              style: 'normal',
            },
            {
              name: 'Inter',
              data: fontData,
              weight: 700,
              style: 'normal',
            },
          ]
        : [],
  });

  // Convert SVG to PNG using Sharp
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Write to file
  await fs.writeFile(outputPath, pngBuffer);
}
