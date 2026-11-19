import { useCallback, useEffect, useMemo } from 'react';
import { useLang, useNavigate, usePage } from '@rspress/core/runtime';
import { useCanonicalLatestBlog } from '@/hooks/use-canonical-latest-blog';
import type { LatestBlogConfig } from '@/hooks/use-latest-blog';
import { BLOG_IS_CROSS_VERSION } from '@route-config';

type ConfigKey = '/' | '/react/' | '/lynxtron/' | '/ui/';

/**
 * Configuration for the blog button on different subsites.
 *
 * For the main site ('/'), the badge shows the latest blog post by date.
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
      // Product-neutral fallback when no blog is available.
      zh: '阅读最新博客',
      en: 'Read the Latest Blog',
    },
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
  '/lynxtron/': {
    latestBlogConfig: { filename: 'lynxtron' },
    text: {
      zh: 'Lynxtron',
      en: 'Lynxtron',
    },
  },
  '/ui/': {
    latestBlogConfig: { filename: 'lynx-ui' },
    text: {
      zh: 'lynx-ui 正式发布',
      en: 'lynx-ui is officially released',
    },
  },
};

const useBlogBtnDom = (src: string) => {
  const { page } = usePage();
  const navigate = useNavigate();
  const lang = useLang() as 'en' | 'zh';

  const configKey = useMemo(() => {
    return (
      src.startsWith('/react/')
        ? '/react/'
        : src.startsWith('/lynxtron/')
          ? '/lynxtron/'
          : src.startsWith('/ui/')
            ? '/ui/'
            : '/'
    ) as ConfigKey;
  }, [src]);

  const {
    blog,
    text: blogText,
    link: blogLink,
    isExternal,
  } = useCanonicalLatestBlog(config[configKey].latestBlogConfig);

  const handleInteraction = useCallback(() => {
    if (!blogLink) return;

    if (isExternal) {
      window.open(blogLink, '_blank');
    } else if (BLOG_IS_CROSS_VERSION) {
      // The blog lives under another version's base, outside this app's
      // router — `navigate` would resolve it against the wrong base.
      window.location.assign(blogLink);
    } else {
      navigate(blogLink);
    }
  }, [navigate, blogLink, isExternal]);

  // Determine the display text
  const displayText = useMemo(() => {
    if (configKey === '/lynxtron/') {
      return blog?.title || config[configKey].text[lang];
    }
    if (configKey === '/') {
      // For main site, use dynamic blog text or fallback
      return blogText || config[configKey].text[lang];
    }
    // For subsites, use static text
    return config[configKey].text[lang];
  }, [configKey, blog, blogText, lang]);

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

    const interactive = configKey !== '/react/' && Boolean(blogLink);
    badgeElement.className = interactive
      ? 'rp-home-hero__badge active-hover'
      : 'rp-home-hero__badge';
    // Upgrade the SSG fallback copy once the post's text is known. The badge
    // is visible the whole time (`opacity: 1` in CSS), so an empty
    // `displayText` must leave the rendered fallback alone rather than blank
    // the pill.
    if (displayText) {
      badgeElement.textContent = displayText;
    }

    const originalRole = badgeElement.getAttribute('role');
    const originalTabIndex = badgeElement.getAttribute('tabindex');
    const handleKeyDown = (event: KeyboardEvent) => {
      // Link semantics use Enter; Space retains normal page scrolling.
      if (event.key !== 'Enter' || event.repeat) return;
      event.preventDefault();
      handleInteraction();
    };

    if (interactive) {
      // Rspress renders string badges as divs. Give these navigation controls
      // link semantics without replacing the React-owned element.
      badgeElement.setAttribute('role', 'link');
      badgeElement.setAttribute('tabindex', '0');
      badgeElement.addEventListener('click', handleInteraction);
      badgeElement.addEventListener('touchstart', handleInteraction);
      badgeElement.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      badgeElement.removeEventListener('click', handleInteraction);
      badgeElement.removeEventListener('touchstart', handleInteraction);
      badgeElement.removeEventListener('keydown', handleKeyDown);
      if (interactive) {
        for (const [name, value] of [
          ['role', originalRole],
          ['tabindex', originalTabIndex],
        ] as const) {
          if (value === null) badgeElement.removeAttribute(name);
          else badgeElement.setAttribute(name, value);
        }
      }
    };
  }, [configKey, blogLink, displayText, handleInteraction, page.pageType]);
};

export { useBlogBtnDom };
