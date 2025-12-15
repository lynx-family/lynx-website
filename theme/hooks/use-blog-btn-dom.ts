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
 * Returns null if build-time data is not available (which shouldn't happen in production).
 */
function getLatestBlogMetadata(
  lang: 'en' | 'zh',
): LatestBlogInfo | null {
  // Get build-time metadata
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

  // Return null if build-time data is not available
  // The badge will fallback to the original "Read the Introductory Blog of Lynx" text
  return null;
}

const useBlogBtnDom = (src: string) => {
  const { page } = usePageData();
  const navigate = useNavigate();
  const lang = useLang() as 'en' | 'zh';
  const badgeElementRef = useRef<HTMLDivElement | null>(null);

  const latestBlogInfo = useMemo(() => getLatestBlogMetadata(lang), [lang]);

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

  useEffect(() => {
    if (page.pageType !== 'home') return;

    const h1 = document.querySelector('h1');
    if (!h1) return;

    const targetElement = h1.parentElement;
    if (!targetElement) return;

    // Check if badge already exists to prevent re-mounting during typing animation
    let badgeElement = badgeElementRef.current;

    const isFirstRender = !badgeElement || !targetElement.contains(badgeElement);

    if (isFirstRender) {
      // Create new badge element only if it doesn't exist
      badgeElement = document.createElement('div');
      badgeElement.className =
        configKey === '/' ? `blog-btn-frame active-hover` : `blog-btn-frame`;

      targetElement.insertBefore(badgeElement, targetElement.firstChild);
      h1.style.margin = '0px -100px';

      badgeElementRef.current = badgeElement;
    }

    // Update badge text (this is cheap and won't trigger animation)
    const displayText =
      configKey === '/' && latestBlogInfo
        ? latestBlogInfo.badgeText
        : config[configKey].text[lang];

    if (badgeElement.textContent !== displayText) {
      badgeElement.textContent = displayText;
    }

    // Handle click event - always update to ensure latest callback is used
    const handleClick = () => {
      if (configKey === '/') {
        navigateToLatestBlog();
      }
    };

    if (configKey === '/') {
      // Remove old listeners if they exist (to prevent stale closure)
      badgeElement.removeEventListener('click', handleClick);
      badgeElement.removeEventListener('touchstart', handleClick);
      
      // Add fresh listeners with current closure
      badgeElement.addEventListener('click', handleClick);
      badgeElement.addEventListener('touchstart', handleClick);

      return () => {
        badgeElement?.removeEventListener('click', handleClick);
        badgeElement?.removeEventListener('touchstart', handleClick);
      };
    }
  }, [configKey, lang, latestBlogInfo, navigateToLatestBlog, page.pageType]);
};

export { useBlogBtnDom };
