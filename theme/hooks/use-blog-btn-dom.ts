import { useCallback, useEffect, useMemo } from 'react';
import { useLang, useNavigate, usePageData } from '@rspress/core/runtime';
import { useLatestBlog, type LatestBlogConfig } from '@site/src/hooks';

type ConfigKey = '/' | '/react/' | '/rspeedy/' | '/lynx-ui/';

/**
 * Configuration for the blog button on different subsites.
 *
 * For the main site ('/'), the badge will show the latest blog post dynamically.
 * Use `latestBlogConfig` to customize which blog to show:
 * - Default: shows the latest blog post
 * - `filename`: specify a blog post by its filename (e.g., 'lynx-3-5')
 * - `externalLink` + `externalText`: use an external link
 */
const config: Record<
  ConfigKey,
  {
    text: { zh: string; en: string };
    latestBlogConfig?: LatestBlogConfig;
  }
> = {
  '/': {
    text: {
      // Fallback text if no blog is found
      zh: '阅读最新博客',
      en: 'Read the Latest Blog',
    },
    // Optional: customize which blog to show
    // latestBlogConfig: {
    //   filename: 'lynx-3-5', // Show a specific blog
    // },
    // Or use an external link:
    // latestBlogConfig: {
    //   externalLink: 'https://example.com',
    //   externalText: 'Check out our event!',
    // },
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
  '/lynx-ui/': {
    text: {
      zh: 'lynx-ui 正式发布',
      en: 'lynx-ui is officially released',
    },
    latestBlogConfig: {
      filename: 'lynx-ui',
    },
  },
};

const useBlogBtnDom = (src: string) => {
  const { page } = usePageData();
  const navigate = useNavigate();
  const lang = useLang() as 'en' | 'zh';

  const configKey = useMemo(() => {
    return (
      src.startsWith('/react/')
        ? '/react/'
        : src.startsWith('/rspeedy/')
          ? '/rspeedy/'
          : src.startsWith('/lynx-ui/')
            ? '/lynx-ui/'
            : '/'
    ) as ConfigKey;
  }, [src]);

  const latestBlogConfig = config[configKey].latestBlogConfig;
  const {
    text: blogText,
    link: blogLink,
    isExternal,
  } = useLatestBlog(latestBlogConfig);

  const handleInteraction = useCallback(() => {
    if (!blogLink) return;

    if (isExternal) {
      window.open(blogLink, '_blank');
    } else {
      navigate(blogLink);
    }
  }, [navigate, blogLink, isExternal]);

  const hasLinkedBlog = !!latestBlogConfig;

  // Determine the display text
  const displayText = useMemo(() => {
    if (hasLinkedBlog) {
      // Use dynamic blog text or fallback
      return blogText || config[configKey].text[lang];
    }
    // For subsites without blog config, use static text
    return config[configKey].text[lang];
  }, [hasLinkedBlog, configKey, blogText, lang]);

  useEffect(() => {
    if (page.pageType !== 'home') return;

    const badgeElement = document.querySelector<HTMLElement>(
      '.rp-home-hero__badge',
    );

    const h1 = document.querySelector('.rp-home-hero__title');
    if (!h1) return;

    const targetElement = h1.parentElement;
    if (!targetElement) return;
    if (!badgeElement) return;

    badgeElement.className = hasLinkedBlog
      ? `rp-home-hero__badge active-hover`
      : `rp-home-hero__badge`;
    badgeElement.textContent = displayText;
    badgeElement.style.opacity = '1';

    if (hasLinkedBlog) {
      badgeElement.addEventListener('click', handleInteraction);
      badgeElement.addEventListener('touchstart', handleInteraction);
    }

    return () => {
      badgeElement.removeEventListener('click', handleInteraction);
      badgeElement.removeEventListener('touchstart', handleInteraction);
    };
  }, [configKey, displayText, handleInteraction]);
};

export { useBlogBtnDom };
