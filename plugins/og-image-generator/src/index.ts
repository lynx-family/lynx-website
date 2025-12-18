import type { RspressPlugin } from '@rspress/core';
import path from 'node:path';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { generateOGImage, OGImageConfig } from './generator';

export type RouteOGImageConfig = {
  /**
   * Route pattern to match (e.g., '/blog/:slug', '/react/*')
   */
  pattern: string | RegExp;
  /**
   * Function to extract OG image config from page data
   */
  getConfig: (pageData: {
    routePath: string;
    frontmatter?: Record<string, any>;
    title?: string;
  }) => OGImageConfig | null;
};

export type OGImageGeneratorOptions = {
  /**
   * Output directory for generated images (relative to public folder)
   * @default 'og-images'
   */
  outputDir?: string;
  /**
   * Base URL for the site
   */
  baseUrl: string;
  /**
   * Route configurations for dynamic OG images
   */
  routes: RouteOGImageConfig[];
  /**
   * Skip image generation if it already exists
   * @default true
   */
  incremental?: boolean;
};

function matchRoute(routePath: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    // Simple glob-like matching
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/:\w+/g, '[^/]+');
    return new RegExp(`^${regexPattern}$`).test(routePath);
  }
  return pattern.test(routePath);
}

async function extractTitleFromMarkdown(
  filePath: string,
): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Look for the first # heading
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  } catch (error) {
    return null;
  }
}

async function updateHtmlOgImage(
  htmlPath: string,
  ogImageUrl: string,
): Promise<void> {
  const html = await fs.readFile(htmlPath, 'utf-8');

  // Replace or add og:image meta tag
  let updatedHtml = html;

  // Remove existing og:image tag if present
  updatedHtml = updatedHtml.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/gi,
    '',
  );

  // Remove existing twitter:image tag if present (support both name and property)
  updatedHtml = updatedHtml.replace(
    /<meta\s+(?:name|property)="twitter:image"\s+content="[^"]*"\s*\/?>/gi,
    '',
  );

  // Add new tags right after the <head> tag
  updatedHtml = updatedHtml.replace(
    /<head>/i,
    `<head>\n    <meta property="og:image" content="${ogImageUrl}"/>\n    <meta name="twitter:image" content="${ogImageUrl}"/>`,
  );

  await fs.writeFile(htmlPath, updatedHtml);
}

function pluginOGImageGenerator(
  options: OGImageGeneratorOptions,
): RspressPlugin {
  const {
    outputDir = 'og-images',
    routes: routeConfigs,
    incremental = true,
    baseUrl,
  } = options;

  // Store mapping of route paths to OG image URLs
  const routeToImageMap = new Map<string, string>();
  // Collect page data during build; used to generate OG images in afterBuild.
  const pages: Array<{
    routePath: string;
    frontmatter?: Record<string, any>;
    title?: string;
    _filepath?: string;
  }> = [];
  const seenRoutePaths = new Set<string>();

  return {
    name: 'rspress-plugin-og-image-generator',

    async extendPageData(pageData: any, isProd: boolean) {
      if (!isProd) return;
      if (!pageData?.routePath || seenRoutePaths.has(pageData.routePath)) return;
      seenRoutePaths.add(pageData.routePath);
      pages.push({
        routePath: pageData.routePath,
        frontmatter: pageData.frontmatter,
        title: pageData.title,
        _filepath: pageData._filepath,
      });
    },

    async afterBuild(config: any, isProd: boolean) {
      // Don't generate/patch in dev
      if (!isProd) return;

      const cwd = process.cwd();
      const publicDir = path.join(cwd, 'docs', 'public');
      const ogImagesDir = path.join(publicDir, 'assets', outputDir);

      const outDir =
        config.outDir || config.builderConfig?.output?.distPath?.root || 'doc_build';
      const buildDir = path.isAbsolute(outDir) ? outDir : path.join(cwd, outDir);
      const buildOgImagesDir = path.join(buildDir, 'assets', outputDir);

      // Ensure output directory exists
      await fs.mkdir(ogImagesDir, { recursive: true });
      await fs.mkdir(buildOgImagesDir, { recursive: true });

      console.log(`\n🎨 Generating OG images...`);

      let generated = 0;
      let skipped = 0;
      const sharedImagesGenerated = new Set<string>();

      for (const page of pages) {
        const routePath = page.routePath;

        // Find matching route config
        const matchingConfig = routeConfigs.find((rc) =>
          matchRoute(routePath, rc.pattern),
        );
        if (!matchingConfig) continue;

        // Prefer page title; fallback to reading the source markdown if available
        let title = page.title;
        if (!title && page._filepath && existsSync(page._filepath)) {
          title = await extractTitleFromMarkdown(page._filepath);
        }

        const ogConfig = matchingConfig.getConfig({
          routePath,
          frontmatter: page.frontmatter,
          title,
        });
        if (!ogConfig) continue;

        // Determine filename - use sharedImageName if provided
        const filename = ogConfig.sharedImageName
          ? ogConfig.sharedImageName
          : routePath
              .replace(/^\//, '')
              .replace(/\//g, '-')
              .replace(/\.html$/, '')
              .replace(/[^a-z0-9-]/gi, '_');

        const imagePath = path.join(ogImagesDir, `${filename}.png`);
        const publicImagePath = `/assets/${outputDir}/${filename}.png`;
        const fullImageUrl = `${baseUrl}${publicImagePath}`;

        routeToImageMap.set(routePath, fullImageUrl);

        if (ogConfig.sharedImageName && sharedImagesGenerated.has(filename)) {
          skipped++;
          continue;
        }

        if (incremental && existsSync(imagePath)) {
          if (ogConfig.sharedImageName) sharedImagesGenerated.add(filename);
          skipped++;
          continue;
        }

        try {
          await generateOGImage(ogConfig, imagePath);
          if (ogConfig.sharedImageName) sharedImagesGenerated.add(filename);
          generated++;
          console.log(`  ✓ Generated: ${publicImagePath}`);
        } catch (error) {
          console.error(`  ✗ Failed to generate ${publicImagePath}:`, error);
        }
      }

      console.log(
        `\n✨ OG image generation complete: ${generated} generated, ${skipped} skipped\n`,
      );

      // Ensure generated images exist in the final build output.
      // (Rspress copies public assets before `afterBuild`, so we need to copy here too.)
      try {
        // Node >=16.7
        // @ts-expect-error - older TS libs may not include fs.cp typing
        await fs.cp(ogImagesDir, buildOgImagesDir, { recursive: true, force: true });
      } catch (e) {
        // Fallback: copy known generated files one by one
        const entries = await fs.readdir(ogImagesDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const src = path.join(ogImagesDir, entry.name);
          const dst = path.join(buildOgImagesDir, entry.name);
          await fs.copyFile(src, dst);
        }
      }

      if (routeToImageMap.size === 0) return;

      console.log(`\n🔧 Updating HTML files with OG images...`);

      let updated = 0;
      for (const [routePath, ogImageUrl] of routeToImageMap.entries()) {
        let htmlPath = path.join(buildDir, routePath);
        if (!htmlPath.endsWith('.html')) htmlPath = htmlPath + '.html';

        const indexHtmlPath = path.join(
          buildDir,
          routePath.replace(/\.html$/, ''),
          'index.html',
        );

        if (existsSync(htmlPath)) {
          await updateHtmlOgImage(htmlPath, ogImageUrl);
          updated++;
          console.log(`  ✓ Updated: ${routePath}`);
        } else if (existsSync(indexHtmlPath)) {
          await updateHtmlOgImage(indexHtmlPath, ogImageUrl);
          updated++;
          console.log(`  ✓ Updated: ${routePath}`);
        }
      }

      console.log(`\n✨ HTML update complete: ${updated} files updated\n`);
    },
  };
}

export { pluginOGImageGenerator };
