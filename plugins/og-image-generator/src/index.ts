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

  // Remove existing twitter:image tag if present
  updatedHtml = updatedHtml.replace(
    /<meta\s+property="twitter:image"\s+content="[^"]*"\s*\/?>/gi,
    '',
  );

  // Add new tags right after the <head> tag
  updatedHtml = updatedHtml.replace(
    /<head>/i,
    `<head>\n    <meta property="og:image" content="${ogImageUrl}"/>\n    <meta property="twitter:image" content="${ogImageUrl}"/>`,
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

  return {
    name: 'rspress-plugin-og-image-generator',

    async routeGenerated(routes: any[]) {
      const cwd = process.cwd();
      const publicDir = path.join(cwd, 'docs', 'public');
      const ogImagesDir = path.join(publicDir, 'assets', outputDir);

      // Ensure output directory exists
      await fs.mkdir(ogImagesDir, { recursive: true });

      console.log(`\n🎨 Generating OG images...`);

      let generated = 0;
      let skipped = 0;

      for (const route of routes) {
        const routePath = route.routePath;

        // Find matching route config
        const matchingConfig = routeConfigs.find((rc) =>
          matchRoute(routePath, rc.pattern),
        );

        if (!matchingConfig) {
          continue;
        }

        // Get OG config for this route
        const ogConfig = matchingConfig.getConfig({
          routePath,
          frontmatter: route.frontmatter,
          title: route.title,
        });

        if (!ogConfig) {
          continue;
        }

        // Generate filename from route path
        const filename = routePath
          .replace(/^\//, '')
          .replace(/\//g, '-')
          .replace(/\.html$/, '')
          .replace(/[^a-z0-9-]/gi, '_');
        const imagePath = path.join(ogImagesDir, `${filename}.png`);
        const publicImagePath = `/assets/${outputDir}/${filename}.png`;
        const fullImageUrl = `${baseUrl}${publicImagePath}`;

        // Store mapping for HTML modification later
        routeToImageMap.set(routePath, fullImageUrl);

        // Skip if image exists and incremental is enabled
        if (incremental && existsSync(imagePath)) {
          skipped++;
          continue;
        }

        try {
          // Generate the OG image
          await generateOGImage(ogConfig, imagePath);
          generated++;
          console.log(`  ✓ Generated: ${publicImagePath}`);
        } catch (error) {
          console.error(`  ✗ Failed to generate ${publicImagePath}:`, error);
        }
      }

      console.log(
        `\n✨ OG image generation complete: ${generated} generated, ${skipped} skipped\n`,
      );
    },

    async afterBuild(config: any) {
      const { outDir = 'doc_build' } = config;
      const cwd = process.cwd();
      const buildDir = path.join(cwd, outDir);

      if (routeToImageMap.size === 0) {
        return;
      }

      console.log(`\n🔧 Updating HTML files with OG images...`);

      let updated = 0;

      // Update HTML files with their respective OG images
      for (const [routePath, ogImageUrl] of routeToImageMap.entries()) {
        // Convert route path to HTML file path
        // Handle both /path and /path.html formats
        let htmlPath = path.join(buildDir, routePath);
        if (!htmlPath.endsWith('.html')) {
          htmlPath = htmlPath + '.html';
        }

        // Also check if it's an index file
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
