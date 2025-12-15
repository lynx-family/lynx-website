import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLang, useNavigate, usePageData } from '@rspress/core/runtime';
import { getLangPrefix } from '@site/shared-route-config';

type ConfigKey = '/' | '/react/' | '/rspeedy/';

const config = {
  '/': {
    text: {
      zh: '阅读 Lynx 的开篇博客',
      en: 'Read the Introductory Blog of Lynx',
    },
  },
  '/react/': {
    text: {
      zh: 'ReactLynx',
      en: 'ReactLynx',
    },
  },
  '/rspeedy/': {
    text: {
      zh: 'Rspeedy',
      en: 'Rspeedy',
    },
  },
};

interface LatestBlogInfo {
  slug: string;
  badgeText: string;
  date: string;
}

interface LatestBlogMetadata {
  en: LatestBlogInfo | null;
  zh: LatestBlogInfo | null;
}

/**
 * Get latest blog metadata from build-time injected data.
 * Falls back to runtime computation if build-time data is not available.
 */
function getLatestBlogMetadata(
  lang: 'en' | 'zh',
  siteData: any,
): LatestBlogInfo | null {
  // Try to get build-time metadata first
  try {
    const buildTimeMetadata: LatestBlogMetadata | undefined =
      typeof process !== 'undefined' && process.env.LATEST_BLOG_METADATA
        ? JSON.parse(process.env.LATEST_BLOG_METADATA)
        : undefined;

    if (buildTimeMetadata && buildTimeMetadata[lang]) {
      return buildTimeMetadata[lang];
    }
  } catch (error) {
    console.warn('Failed to parse build-time blog metadata:', error);
  }

  // Fallback to runtime computation
  if (!siteData?.pages) {
    return null;
  }

  try {
    const langPrefix = lang === 'en' ? '' : '/zh';
    const blogPrefix = `${langPrefix}/blog/`;

    const blogPages = siteData.pages
      .filter((p: { routePath?: string }) => {
        const routePath = p.routePath || '';
        const blogBasePath = blogPrefix.replace(/\/$/, '');
        return (
          routePath.startsWith(blogPrefix) &&
          routePath !== blogBasePath &&
          routePath !== blogPrefix + 'index'
        );
      })
      .sort(
        (
          a: { frontmatter?: { date?: string } },
          b: { frontmatter?: { date?: string } },
        ) => {
          const dateA = a.frontmatter?.date
            ? new Date(a.frontmatter.date).getTime()
            : 0;
          const dateB = b.frontmatter?.date
            ? new Date(b.frontmatter.date).getTime()
            : 0;
          return dateB - dateA;
        },
      );

    if (blogPages.length === 0) {
      return null;
    }

    const latestBlog = blogPages[0];
    const routePath = latestBlog.routePath || '';
    const slug = routePath.replace(blogPrefix, '');

    const badgeText =
      latestBlog.frontmatter?.badgeText ||
      (lang === 'zh' ? `阅读最新博客` : `Read the Latest Blog`);

    return {
      slug,
      badgeText,
      date: latestBlog.frontmatter?.date || '',
    };
  } catch (error) {
    console.error('Error getting latest blog at runtime:', error);
    return null;
  }
}

const useBlogBtnDom = (src: string) => {
  const { page, siteData } = usePageData();
  const navigate = useNavigate();
  const lang = useLang() as 'en' | 'zh';
  const badgeElementRef = useRef<HTMLDivElement | null>(null);

  const latestBlogInfo = useMemo(
    () => getLatestBlogMetadata(lang, siteData),
    [lang, siteData],
  );

  const navigateToLatestBlog = useCallback(() => {
    const targetSlug = latestBlogInfo?.slug || 'lynx-unlock-native-for-more';
    navigate(`${getLangPrefix(lang)}/blog/${targetSlug}`);
  }, [navigate, lang, latestBlogInfo]);

  const configKey = useMemo(() => {
    return (
      src.startsWith('/react/')
        ? '/react/'
        : src.startsWith('/rspeedy/')
          ? '/rspeedy/'
          : '/'
    ) as ConfigKey;
  }, [src]);

  // Memoize the click handler to maintain reference stability
  const handleBadgeClick = useCallback(() => {
    if (configKey === '/') {
      navigateToLatestBlog();
    }
  }, [configKey, navigateToLatestBlog]);

  useEffect(() => {
    if (page.pageType !== 'home') return;

    const h1 = document.querySelector('h1');
    if (!h1) return;

    const targetElement = h1.parentElement;
    if (!targetElement) return;

    // Check if badge already exists to prevent re-mounting during typing animation
    let badgeElement = badgeElementRef.current;

    if (!badgeElement || !targetElement.contains(badgeElement)) {
      // Create new badge element only if it doesn't exist
      badgeElement = document.createElement('div');
      badgeElement.className =
        configKey === '/' ? `blog-btn-frame active-hover` : `blog-btn-frame`;

      targetElement.insertBefore(badgeElement, targetElement.firstChild);
      h1.style.margin = '0px -100px';

      badgeElementRef.current = badgeElement;

      // Attach event listeners only when creating the element
      if (configKey === '/') {
        badgeElement.addEventListener('click', handleBadgeClick);
        badgeElement.addEventListener('touchstart', handleBadgeClick);
      }
    }

    // Update badge text (this is cheap and won't trigger animation)
    const displayText =
      configKey === '/' && latestBlogInfo
        ? latestBlogInfo.badgeText
        : config[configKey].text[lang];

    if (badgeElement.textContent !== displayText) {
      badgeElement.textContent = displayText;
    }

    return () => {
      // Cleanup only when component unmounts or page type changes
      if (badgeElementRef.current && configKey === '/') {
        badgeElementRef.current.removeEventListener('click', handleBadgeClick);
        badgeElementRef.current.removeEventListener(
          'touchstart',
          handleBadgeClick,
        );
      }
    };
  }, [configKey, lang, latestBlogInfo, handleBadgeClick, page.pageType]);
};

export { useBlogBtnDom };
