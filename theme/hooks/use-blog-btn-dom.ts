import { useCallback, useEffect, useMemo } from 'react';
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

const useBlogBtnDom = (src: string) => {
  const { page, siteData } = usePageData();
  const navigate = useNavigate();
  const lang = useLang() as 'en' | 'zh';

  // Get latest blog post information from siteData using useMemo to avoid infinite loops
  const latestBlogInfo = useMemo(() => {
    if (!siteData?.pages) {
      return null;
    }

    try {
      const langPrefix = lang === 'en' ? '' : '/zh';
      const blogPrefix = `${langPrefix}/blog/`;

      // Filter blog pages and sort by date (newest first)
      const blogPages = siteData.pages
        .filter((p: { routePath?: string }) => {
          const routePath = p.routePath || '';
          // Filter blog posts (not the index page)
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
            return dateB - dateA; // Newest first
          },
        );

      if (blogPages.length === 0) {
        return null;
      }

      // Get the latest blog post
      const latestBlog = blogPages[0];
      const routePath = latestBlog.routePath || '';
      const slug = routePath.replace(blogPrefix, '');

      // Get badge text from frontmatter, or use a default
      const badgeText =
        latestBlog.frontmatter?.badgeText ||
        (lang === 'zh' ? `阅读最新博客` : `Read the Latest Blog`);

      return {
        slug,
        badgeText,
      };
    } catch (error) {
      console.error('Error getting latest blog:', error);
      return null;
    }
  }, [lang, siteData]);

  const handleInteraction = useCallback(() => {
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

    const newElement = document.createElement('div');
    newElement.className =
      configKey === '/' ? `blog-btn-frame active-hover` : `blog-btn-frame`;

    // Use dynamic badge text for '/' route, otherwise use static config
    const displayText =
      configKey === '/' && latestBlogInfo
        ? latestBlogInfo.badgeText
        : config[configKey].text[lang];

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
  }, [configKey, lang, latestBlogInfo, handleInteraction]);
};

export { useBlogBtnDom };
