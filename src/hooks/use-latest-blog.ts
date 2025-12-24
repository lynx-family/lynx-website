import { useBlogPages, type BlogItem } from './use-blog-pages';

export type LatestBlogConfig = {
  /**
   * Specify a blog post by its filename (without extension) to use instead of the latest.
   * E.g. 'lynx-3-5' for 'lynx-3-5.mdx'
   */
  filename?: string;
  /**
   * Use an external link instead of a blog post.
   */
  externalLink?: string;
  /**
   * Custom text to display when using external link.
   */
  externalText?: string;
};

export type LatestBlogResult = {
  /**
   * The blog item (null if using external link or not found)
   */
  blog: BlogItem | null;
  /**
   * The text to display in the badge
   */
  text: string | null;
  /**
   * The link to navigate to
   */
  link: string | null;
  /**
   * Whether this is an external link
   */
  isExternal: boolean;
};

/**
 * Hook to get the latest blog post or a specific blog post for display in badges/banners.
 *
 * Supports three scenarios:
 * 1. Get the latest blog post (default)
 * 2. Specify a non-latest blog by filename
 * 3. Use an external link for arbitrary events
 *
 * @param config Optional configuration for customizing which blog to show
 * @returns The blog item with text and link for display
 */
export const useLatestBlog = (config?: LatestBlogConfig): LatestBlogResult => {
  const blogPages = useBlogPages();

  // Scenario 3: External link
  if (config?.externalLink) {
    return {
      blog: null,
      text: config.externalText || null,
      link: config.externalLink,
      isExternal: true,
    };
  }

  // Scenario 2: Specific blog by filename
  if (config?.filename) {
    const specificBlog = blogPages.find(
      (blog) => blog.filename === config.filename,
    );
    if (specificBlog) {
      return {
        blog: specificBlog,
        text: specificBlog.badgeText || specificBlog.title || null,
        link: specificBlog.link || null,
        isExternal: false,
      };
    }
  }

  // Scenario 1: Latest blog (default)
  const latestBlog = blogPages[0] || null;
  if (latestBlog) {
    return {
      blog: latestBlog,
      text: latestBlog.badgeText || latestBlog.title || null,
      link: latestBlog.link || null,
      isExternal: false,
    };
  }

  return {
    blog: null,
    text: null,
    link: null,
    isExternal: false,
  };
};
