/**
 * Plugin to generate static metadata for the latest blog post at build time.
 * This metadata is injected into the bundle via process.env for runtime access.
 */
import type { RspressPlugin } from '@rspress/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface BlogMetadata {
  slug: string;
  badgeText: string;
  date: string;
}

interface LatestBlogMetadata {
  en: BlogMetadata | null;
  zh: BlogMetadata | null;
}

/**
 * Extract frontmatter from MDX file content.
 * Handles simple YAML frontmatter with key: value pairs.
 * For more complex YAML, consider using a library like gray-matter.
 */
function extractFrontmatter(content: string): Record<string, any> {
  // Match frontmatter with flexible whitespace handling
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*$/m;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {};
  }

  const frontmatterText = match[1];
  const frontmatter: Record<string, any> = {};

  // Parse simple YAML frontmatter (key: value format)
  frontmatterText.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    // Only process lines with a colon (skip if not found with -1)
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove surrounding quotes if present
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }

      // Handle boolean values
      if (value === 'true') {
        frontmatter[key] = true;
      } else if (value === 'false') {
        frontmatter[key] = false;
      } else {
        frontmatter[key] = value;
      }
    }
  });

  return frontmatter;
}

/**
 * Get the latest blog post for a specific language
 */
function getLatestBlog(
  docsRoot: string,
  lang: 'en' | 'zh',
): BlogMetadata | null {
  const blogDir =
    lang === 'en'
      ? path.join(docsRoot, 'en', 'blog')
      : path.join(docsRoot, 'zh', 'blog');

  const metaPath = path.join(blogDir, '_meta.json');

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const metaList: string[] = JSON.parse(metaContent);

    if (!Array.isArray(metaList) || metaList.length === 0) {
      return null;
    }

    // The first item in _meta.json is the latest blog post
    const latestSlug = metaList[0];
    const blogFilePath = path.join(blogDir, `${latestSlug}.mdx`);

    if (!fs.existsSync(blogFilePath)) {
      return null;
    }

    const blogContent = fs.readFileSync(blogFilePath, 'utf-8');
    const frontmatter = extractFrontmatter(blogContent);

    const defaultBadgeText =
      lang === 'zh' ? '阅读最新博客' : 'Read the Latest Blog';

    return {
      slug: latestSlug,
      badgeText: frontmatter.badgeText || defaultBadgeText,
      date: frontmatter.date || '',
    };
  } catch (error) {
    console.error(`Error reading latest blog metadata for ${lang}:`, error);
    return null;
  }
}

export function pluginLatestBlogMetadata(): RspressPlugin {
  return {
    name: 'rspress-plugin-latest-blog-metadata',
    globalUIComponents: [],

    config(config) {
      const docsRoot = config.root || path.join(process.cwd(), 'docs');

      // Generate metadata at build time
      const latestBlogMetadata: LatestBlogMetadata = {
        en: getLatestBlog(docsRoot, 'en'),
        zh: getLatestBlog(docsRoot, 'zh'),
      };

      // Inject metadata into the build
      const originalDefine = config.builderConfig?.source?.define || {};

      return {
        ...config,
        builderConfig: {
          ...config.builderConfig,
          source: {
            ...config.builderConfig?.source,
            define: {
              ...originalDefine,
              'process.env.LATEST_BLOG_METADATA':
                JSON.stringify(latestBlogMetadata),
            },
          },
        },
      };
    },
  };
}
