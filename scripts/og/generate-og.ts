import fs from 'node:fs';
import path from 'node:path';

console.log('Script started');

import { Resvg } from '@resvg/resvg-js';
import matter from 'gray-matter';
import satori from 'satori';

const DOCS_DIR = path.join(process.cwd(), 'docs');
const PUBLIC_DIR = path.join(DOCS_DIR, 'public');
const OG_DIR = path.join(PUBLIC_DIR, 'og');
const BLOG_EN_DIR = path.join(DOCS_DIR, 'en', 'blog');
const BLOG_ZH_DIR = path.join(DOCS_DIR, 'zh', 'blog');

// Ensure OG directory exists
if (!fs.existsSync(OG_DIR)) {
  fs.mkdirSync(OG_DIR, { recursive: true });
}

// Load font
// We'll use a fetch to get a font if we don't have one locally easily accessible
// For now, let's try to find a system font or fetch one.
// To keep it simple and self-contained, I'll fetch Inter from Google Fonts.

async function fetchFont() {
  const response = await fetch(
    'https://github.com/google/fonts/raw/main/ofl/inter/Inter-Bold.ttf',
  );
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function fetchRegularFont() {
  const response = await fetch(
    'https://github.com/google/fonts/raw/main/ofl/inter/Inter-Regular.ttf',
  );
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateOgImage(
  title: string,
  description: string,
  date: string,
  outputPath: string,
  fontData: Buffer,
  fontRegularData: Buffer,
) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          height: '100%',
          width: '100%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundImage: 'linear-gradient(to bottom right, #111111, #222222)',
          color: 'white',
          padding: '80px',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 64,
                      fontWeight: 'bold',
                      marginBottom: 24,
                      lineHeight: 1.2,
                      background: 'linear-gradient(to right, #fff, #aaa)',
                      backgroundClip: 'text',
                      color: 'transparent',
                    },
                    children: title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 32,
                      color: '#cccccc',
                      lineHeight: 1.4,
                    },
                    children:
                      description && description.length > 150
                        ? description.substring(0, 150) + '...'
                        : description,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
                marginTop: 40,
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 24, color: '#888' },
                    children: date,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 32, fontWeight: 'bold' },
                    children: 'Lynx',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: fontRegularData,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  );

  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated OG image: ${outputPath}`);
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.*)$/m);
  return match ? match[1] : 'Lynx Blog';
}

async function processDirectory(
  dir: string,
  outputSubDir: string,
  fontData: Buffer,
  fontRegularData: Buffer,
) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;

    const filePath = path.join(dir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Skip if sidebar is false (usually index pages or hidden pages), but for blog we usually want them.
    // However, index.mdx might be the list page.
    if (file === 'index.mdx') continue;

    const title = data.title || extractTitle(content);
    const description = data.description || '';
    const date = data.date
      ? new Date(data.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    const outputDir = path.join(OG_DIR, outputSubDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilename = file.replace(/\.mdx?$/, '.png');
    const outputPath = path.join(outputDir, outputFilename);

    await generateOgImage(
      title,
      description,
      date,
      outputPath,
      fontData,
      fontRegularData,
    );
  }
}

async function main() {
  console.log('Fetching fonts...');
  const fontData = await fetchFont();
  const fontRegularData = await fetchRegularFont();

  console.log('Processing English blog posts...');
  await processDirectory(BLOG_EN_DIR, 'blog', fontData, fontRegularData);

  console.log('Processing Chinese blog posts...');
  await processDirectory(BLOG_ZH_DIR, 'zh/blog', fontData, fontRegularData);
}

main().catch(console.error);
