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
  /**
   * Shared image name - if provided, use this as the filename instead of route-based name
   * This allows multiple routes to share the same image
   */
  sharedImageName?: string;
};

// Cache for font data
let fontDataCache: {
  inter: {
    regular: ArrayBuffer;
    bold: ArrayBuffer;
  };
  notoSansSC: {
    regular: ArrayBuffer;
    bold: ArrayBuffer;
  };
} | null = null;

// Check if text contains Chinese characters
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

async function getFontData(): Promise<{
  inter: {
    regular: ArrayBuffer;
    bold: ArrayBuffer;
  };
  notoSansSC: {
    regular: ArrayBuffer;
    bold: ArrayBuffer;
  };
}> {
  if (fontDataCache) {
    return fontDataCache;
  }

  try {
    // Try to use fontsource packages
    const dirname = path.dirname(fileURLToPath(import.meta.url || ''));

    // Load Inter font paths
    const interPath = path.join(
      dirname,
      '..',
      'node_modules',
      '@fontsource',
      'inter',
      'files',
    );

    // Load Noto Sans SC font paths
    const notoSansSCPath = path.join(
      dirname,
      '..',
      'node_modules',
      '@fontsource',
      'noto-sans-sc',
      'files',
    );

    // Load all font files
    const [interRegular, interBold, notoSCRegular, notoSCBold] =
      await Promise.all([
        fs.readFile(path.join(interPath, 'inter-latin-400-normal.woff')),
        fs.readFile(path.join(interPath, 'inter-latin-700-normal.woff')),
        fs.readFile(
          path.join(
            notoSansSCPath,
            'noto-sans-sc-chinese-simplified-400-normal.woff',
          ),
        ),
        fs.readFile(
          path.join(
            notoSansSCPath,
            'noto-sans-sc-chinese-simplified-700-normal.woff',
          ),
        ),
      ]);

    fontDataCache = {
      inter: {
        regular: interRegular.buffer,
        bold: interBold.buffer,
      },
      notoSansSC: {
        regular: notoSCRegular.buffer,
        bold: notoSCBold.buffer,
      },
    };

    return fontDataCache;
  } catch (error) {
    console.error('Failed to load fonts from @fontsource packages:', error);

    // Fallback: try to fetch from CDN
    try {
      const [interRegularRes, interBoldRes] = await Promise.all([
        fetch(
          'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff',
        ),
        fetch(
          'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff',
        ),
      ]);

      // For Chinese fonts, we'll use a fallback
      const notoSCUrl =
        'https://fonts.gstatic.com/s/notosanssc/v36/k3kXo84MPvpLmixcA63oeALhL4iJ-Q7m8w.woff';
      const [notoSCRegularRes, notoSCBoldRes] = await Promise.all([
        fetch(notoSCUrl),
        fetch(notoSCUrl), // Using same for both weights as fallback
      ]);

      fontDataCache = {
        inter: {
          regular: await interRegularRes.arrayBuffer(),
          bold: await interBoldRes.arrayBuffer(),
        },
        notoSansSC: {
          regular: await notoSCRegularRes.arrayBuffer(),
          bold: await notoSCBoldRes.arrayBuffer(),
        },
      };

      return fontDataCache;
    } catch (fetchError) {
      throw new Error(
        'Could not load fonts. Please ensure @fontsource packages are installed or internet is available.',
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

  // Determine if we need Chinese fonts
  const needsChinese =
    containsChinese(title) ||
    (subtitle && containsChinese(subtitle)) ||
    containsChinese(logo);

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
      data: fonts.inter.regular,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: fonts.inter.bold,
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Noto Sans SC',
      data: fonts.notoSansSC.regular,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Noto Sans SC',
      data: fonts.notoSansSC.bold,
      weight: 700,
      style: 'normal',
    },
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
