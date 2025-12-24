import { useCallback, useEffect, useMemo } from 'react';
import { useLang, useNavigate, usePageData } from '@rspress/core/runtime';
import { useLatestBlog, type LatestBlogConfig } from '@site/src/hooks';

type ConfigKey = '/' | '/react/' | '/rspeedy/';

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

  // Determine the display text
  const displayText = useMemo(() => {
    if (configKey === '/') {
      // For main site, use dynamic blog text or fallback
      return blogText || config[configKey].text[lang];
    }
    // For subsites, use static text
    return config[configKey].text[lang];
  }, [configKey, blogText, lang]);

  useEffect(() => {
    if (page.pageType !== 'home') return;

    const h1 = document.querySelector('h1');
    if (!h1) return;

    const targetElement = h1.parentElement;
    if (!targetElement) return;

    const newElement = document.createElement('div');
    newElement.className =
      configKey === '/' ? `blog-btn-frame active-hover` : `blog-btn-frame`;
    newElement.textContent = displayText;

    targetElement.insertBefore(newElement, targetElement.firstChild);
    h1.style.margin = '0px -100px';

    if (configKey === '/') {
      newElement.addEventListener('click', handleInteraction);
      newElement.addEventListener('touchstart', handleInteraction);
    }

    return () => {
      newElement.removeEventListener('click', handleInteraction);
      newElement.removeEventListener('touchstart', handleInteraction);

      targetElement.removeChild(newElement);
    };
  }, [configKey, displayText, handleInteraction]);
};

export { useBlogBtnDom };
