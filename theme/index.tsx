import {
  Head,
  removeBase,
  useLang,
  useLocation,
  usePageData,
} from '@rspress/core/runtime';
import {
  HomeLayout as BaseHomeLayout,
  Layout as BaseLayout,
  Link as BaseLink,
  getCustomMDXComponent as basicGetCustomMDXComponent,
} from '@rspress/core/theme-original';
import {
  Search as PluginAlgoliaSearch,
  ZH_LOCALES,
} from '@rspress/plugin-algolia/runtime';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './index.scss';
import { HomeLayout as LynxUIHomeLayout } from './lynx-ui-home';

import {
  Banner,
  Features,
  Footer,
  GalaxyHeroBackground,
  LynxtronFeatures,
  MeteorsBackground,
  ShowCase,
} from '@/components/home-comps';
import { SUBSITES_CONFIG } from '@site/shared-route-config';
import AfterNavTitle from './AfterNavTitle';
import BeforeSidebar from './BeforeSidebar';
import OgHead from './OgHead';
import { useBlogBtnDom } from './hooks/use-blog-btn-dom';

// Match subsite by checking if any path segment exactly equals the subsite value
const findSubsite = (pathname: string) => {
  const segments = pathname.split('/');
  return SUBSITES_CONFIG.find((s) => {
    if (s.value === 'ui') {
      return segments.some((seg) => {
        const normalized = seg.replace(/\.html$/, '');
        return normalized === s.value || normalized === 'lynx-ui';
      });
    }

    return segments.some((seg) => seg.replace(/\.html$/, '') === s.value);
  });
};

const NULL_BYTE_RE = /\u0000/g;

const sanitizeHeadingAnchors = () => {
  document
    .querySelectorAll<HTMLElement>(
      '.rspress-doc h1[id], .rspress-doc h2[id], .rspress-doc h3[id], .rspress-doc h4[id], .rspress-doc h5[id], .rspress-doc h6[id]',
    )
    .forEach((heading) => {
      if (heading.id.includes('\u0000')) {
        heading.id = heading.id.replace(NULL_BYTE_RE, '');
      }

      const anchor = heading.querySelector<HTMLAnchorElement>(
        'a.rp-header-anchor[href]',
      );
      const href = anchor?.getAttribute('href');
      if (anchor && href?.includes('\u0000')) {
        anchor.setAttribute('href', href.replace(NULL_BYTE_RE, ''));
      }
    });
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      htmlAttrs: unknown;
    }
  }
}

function Layout({
  afterNavTitle = <AfterNavTitle />,
  ...props
}: Parameters<typeof BaseLayout>[0]) {
  const { pathname } = useLocation();
  const subsite = findSubsite(pathname);
  const normalizedPath = removeBase(pathname);
  const pathNoLang = normalizedPath.replace(/^\/zh\//, '/');
  const isStatusRoute = /^\/api\/status\/?$/.test(pathNoLang);

  useEffect(() => {
    sanitizeHeadingAnchors();
  }, [pathname]);

  return (
    <>
      <Head>
        <htmlAttrs
          data-subsite={subsite ? subsite.value : 'guide'}
          data-scroll-locked={isStatusRoute ? 'true' : null}
        />
      </Head>
      <OgHead />
      <BaseLayout
        {...props}
        afterNavTitle={afterNavTitle}
        beforeSidebar={<BeforeSidebar />}
        bottom={<Footer />}
      />
    </>
  );
}

const enSuffix = ' Native for More';
const enWords = ['Unlock', 'Render', 'Vibe', 'Ship'];
const zhWords = ['迈向', '更快的', '更多平台的', '更多人的'];
const zhSuffix = '原生体验';

// Extend ImportMeta to include SSG-MD
declare global {
  interface ImportMetaEnv {
    SSG_MD?: boolean;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

function MainHomeLayout(props: Parameters<typeof BaseHomeLayout>[0]) {
  if (import.meta.env.SSG_MD) {
    return <BaseHomeLayout {...props} />;
  }
  const { pathname } = useLocation();
  const isZh = pathname.startsWith('/zh/');
  const { page } = usePageData();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState(
    isZh ? `${zhWords[0]}${zhSuffix}` : `${enWords[0]}${enSuffix}`,
  );
  const [delta, setDelta] = useState(200);
  const [isPaused, setIsPaused] = useState(false);

  const routePath = useMemo(() => {
    let tmp = page.routePath.replace('/zh/', '/');
    return removeBase(tmp);
  }, [page]);

  const isLynxtron = routePath.startsWith('/lynxtron/');
  const createCliStr = isLynxtron
    ? 'npm create @lynx-js/lynxtron@latest'
    : 'npm create rspeedy@latest';

  useBlogBtnDom(routePath);

  const updateText = useCallback(() => {
    const titleEle = document.querySelector('.rp-home-hero__title');
    const titleTextSpan = document.querySelector('.rp-home-hero__title > span');
    if (!titleEle) return;
    if (!titleTextSpan) return;

    const words = isZh ? zhWords : enWords;
    const suffix = isZh ? zhSuffix : enSuffix;

    const currentWord = words[currentWordIndex];
    const currentLength = text.replace(suffix, '').length;
    const dynamicText = isDeleting
      ? currentWord.substring(0, currentLength - 1)
      : currentWord.substring(0, currentLength + 1);

    const fullText = `${dynamicText}${suffix}`;
    setText(fullText);

    const dynamicSpan = titleTextSpan.querySelector('.dynamic-text');
    const suffixSpan = titleTextSpan.querySelector('.suffix-text');

    if (!dynamicSpan || !suffixSpan) {
      titleTextSpan.innerHTML = `
        <span class="dynamic-text">${dynamicText}</span><span class="suffix-text">${suffix}</span>
      `;
    } else {
      dynamicSpan.textContent = dynamicText;
      suffixSpan.textContent = suffix;
    }

    if (!isDeleting && dynamicText === currentWord) {
      if (!isPaused) {
        setIsPaused(true);
        setDelta(2000);
      } else {
        setIsPaused(false);
        setIsDeleting(true);
        setDelta(100);
      }
    } else if (isDeleting && dynamicText === '') {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
      setDelta(140);
    }
  }, [currentWordIndex, isDeleting, text, isPaused, isZh]);

  // Reset animation when language changes or when returning to home page
  useEffect(() => {
    const isHomePage = routePath === '/';

    if (isHomePage) {
      // Reset all states when returning to home
      setCurrentWordIndex(0);
      setIsDeleting(false);
      setIsPaused(false);
      setDelta(200);
      setText(isZh ? `${zhWords[0]}${zhSuffix}` : `${enWords[0]}${enSuffix}`);
    }
  }, [isZh, page]); // Watch both language and path changes

  useEffect(() => {
    const isHomePage = routePath === '/';

    if (!isHomePage) {
      return;
    }

    const ticker = setInterval(updateText, delta);
    return () => clearInterval(ticker);
  }, [updateText, delta, page]);

  const { pre: PreWithCodeButtonGroup, code: Code } =
    basicGetCustomMDXComponent();
  const copyElementRef = useRef<HTMLElement | null>(null);
  const CodeWithRef = Code as unknown as React.ComponentType<
    React.ComponentProps<typeof Code> & { ref?: React.Ref<HTMLElement> }
  >;

  // Rspress would pass `afterHero: undefined` and `afterHeroActions: undefined` props to HomeLayout,
  const {
    afterHero = isLynxtron ? (
      <LynxtronFeatures />
    ) : (
      <>
        <Features src={routePath} />
        {routePath === '/' && <ShowCase />}
        {routePath === '/' && <Banner />}
      </>
    ),
    afterHeroActions = (
      <>
        <div
          className="rp-doc home-hero-codeblock"
          style={{
            minHeight: 'auto',
            width: '100%',
            maxWidth: isLynxtron ? 450 : 300,
          }}
        >
          <PreWithCodeButtonGroup
            containerElementClassName="language-bash"
            codeButtonGroupProps={{
              copyElementRef:
                copyElementRef as unknown as React.RefObject<HTMLDivElement | null>,
              showCodeWrapButton: false,
            }}
          >
            <CodeWithRef
              ref={copyElementRef}
              className="language-bash"
              style={{ textAlign: 'center' }}
            >
              {createCliStr}
            </CodeWithRef>
          </PreWithCodeButtonGroup>
        </div>
      </>
    ),
    beforeHero = isLynxtron ? <GalaxyHeroBackground /> : undefined,
  } = props;

  return (
    <>
      {isLynxtron ? null : <MeteorsBackground gridSize={120} meteorCount={3} />}
      <div className="home-layout-container">
        <BaseHomeLayout
          {...props}
          beforeHero={beforeHero}
          afterHero={afterHero}
          afterHeroActions={afterHeroActions}
        />
      </div>
    </>
  );
}

function HomeLayout(props: Parameters<typeof BaseHomeLayout>[0]) {
  const { pathname } = useLocation();
  const { page } = usePageData();

  // Update theme based on URL
  useEffect(() => {
    const subsite = findSubsite(pathname);
    document.documentElement.setAttribute(
      'data-subsite',
      subsite ? subsite.value : 'guide',
    );
  }, [pathname]);

  if (
    page.pagePath.startsWith('en/ui/') ||
    page.pagePath.startsWith('zh/ui/') ||
    page.pagePath.startsWith('ui/')
  ) {
    return (
      <>
        <OgHead />
        <div className="lynx-ui-home-layout-container">
          <LynxUIHomeLayout />
        </div>
      </>
    );
  }

  return (
    <>
      <OgHead />
      <MainHomeLayout {...props} />
    </>
  );
}

const Search = () => {
  const lang = useLang();
  return (
    <PluginAlgoliaSearch
      docSearchProps={{
        appId: 'V4ET1OFZ5S', // cspell:disable-line
        apiKey: '15236c16e0f335c0cb2a67bc3ac06bcb', // cspell:disable-line
        indexName: 'lynx_next',
        searchParameters: {
          facetFilters: [`lang:${lang}`],
        },
        maxResultsPerGroup: 5,
        transformItems: (items) => {
          return items.map((item) => {
            // we already have basename, so pass the url without base to Link and navigate
            const url = new URL(item.url);
            item.url = item.url.replace(url.origin, '');
            item.url = removeBase(item.url);
            return item;
          });
        },
      }}
      locales={ZH_LOCALES}
    />
  );
};

export { HomeLayout, Layout, Search };

type BaseLinkProps = Parameters<typeof BaseLink>[0];
type BaseLinkRestProps = Omit<
  BaseLinkProps,
  'href' | 'children' | 'className' | 'style'
>;

const Link = forwardRef<HTMLAnchorElement, BaseLinkProps>((props, ref) => {
  const { href, children, className, style, ...restProps } = props;
  const safeRestProps = restProps as BaseLinkRestProps;
  const lang = useLang();
  const { pathname, search } = useLocation();
  const getLangPrefix = (value: string) => (value === 'en' ? '' : `/${value}`);
  let normalizedHref = href;

  if (
    href &&
    safeRestProps.rel === 'alternate' &&
    safeRestProps.lang === lang
  ) {
    normalizedHref = removeBase(`${pathname}${search}`);
  }

  if (normalizedHref?.startsWith(`${getLangPrefix(lang)}/blog`)) {
    return (
      <BaseLink
        href={`/next${removeBase(normalizedHref)}`}
        className={className ? `rp-link ${className}` : 'rp-link'}
        ref={ref}
        style={style as any}
        {...safeRestProps}
      >
        {children}
      </BaseLink>
    );
  }
  return (
    <BaseLink
      href={normalizedHref}
      className={className}
      ref={ref}
      style={style as any}
      {...safeRestProps}
    >
      {children}
    </BaseLink>
  );
});

export { Link }; // override Link from @rspress/core/theme-original

export * from '@rspress/core/theme-original';
