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
  MeteorsBackground,
  ShowCase,
} from '@/components/home-comps';
import { SUBSITES_CONFIG } from '@site/shared-route-config';
import AfterNavTitle from './AfterNavTitle';
import BeforeSidebar from './BeforeSidebar';
import { useBlogBtnDom } from './hooks/use-blog-btn-dom';

// Match subsite by checking if any path segment exactly equals the subsite value
const findSubsite = (pathname: string) => {
  const segments = pathname.split('/');
  return SUBSITES_CONFIG.find((s) =>
    segments.some((seg) => seg.replace(/\.html$/, '') === s.value),
  );
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

  return (
    <>
      <Head>
        <htmlAttrs
          data-subsite={subsite ? subsite.value : 'guide'}
          data-scroll-locked={isStatusRoute ? 'true' : null}
        />
      </Head>
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
  const normalizedPathname = removeBase(pathname);
  const isZh = normalizedPathname.startsWith('/zh/');
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

  useBlogBtnDom(routePath);

  const getDynamicText = useCallback(
    (value: string) => {
      const suffix = isZh ? zhSuffix : enSuffix;
      return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
    },
    [isZh],
  );

  const applyHeroTitleText = useCallback(
    (dynamicText: string) => {
      const suffix = isZh ? zhSuffix : enSuffix;
      const titleTextSpan = document.querySelector<HTMLElement>(
        '.rp-home-hero__title-brand',
      );
      if (!titleTextSpan) return false;

      let dynamicSpan =
        titleTextSpan.querySelector<HTMLElement>('.dynamic-text');
      let suffixSpan = titleTextSpan.querySelector<HTMLElement>('.suffix-text');

      if (!dynamicSpan || !suffixSpan) {
        titleTextSpan.textContent = '';
        dynamicSpan = document.createElement('span');
        dynamicSpan.className = 'dynamic-text';
        suffixSpan = document.createElement('span');
        suffixSpan.className = 'suffix-text';
        titleTextSpan.append(dynamicSpan, suffixSpan);
      }

      dynamicSpan.textContent = dynamicText;
      suffixSpan.textContent = suffix;
      return true;
    },
    [isZh],
  );

  const updateText = useCallback(() => {
    const words = isZh ? zhWords : enWords;
    const suffix = isZh ? zhSuffix : enSuffix;

    const currentWord = words[currentWordIndex];
    const currentLength = getDynamicText(text).length;
    const dynamicText = isDeleting
      ? currentWord.substring(0, currentLength - 1)
      : currentWord.substring(0, currentLength + 1);

    const fullText = `${dynamicText}${suffix}`;
    setText(fullText);
    if (!applyHeroTitleText(dynamicText)) return;

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
  }, [
    applyHeroTitleText,
    currentWordIndex,
    getDynamicText,
    isDeleting,
    text,
    isPaused,
    isZh,
  ]);

  useEffect(() => {
    if (routePath !== '/') {
      return;
    }

    applyHeroTitleText(getDynamicText(text));
  }, [applyHeroTitleText, getDynamicText, routePath, text]);

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
  }, [isZh, routePath]); // Watch both language and path changes

  useEffect(() => {
    const isHomePage = routePath === '/';

    if (!isHomePage) {
      return;
    }

    const ticker = setInterval(updateText, delta);
    return () => clearInterval(ticker);
  }, [updateText, delta, routePath]);

  const { pre: PreWithCodeButtonGroup, code: Code } =
    basicGetCustomMDXComponent();
  const copyElementRef = useRef<HTMLElement | null>(null);
  const CodeWithRef = Code as unknown as React.ComponentType<
    React.ComponentProps<typeof Code> & { ref?: React.Ref<HTMLElement> }
  >;

  // Rspress would pass `afterHero: undefined` and `afterHeroActions: undefined` props to HomeLayout,
  const {
    afterHero = (
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
          style={{ minHeight: 'auto', width: '100%', maxWidth: 300 }}
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
              npm create rspeedy@latest
            </CodeWithRef>
          </PreWithCodeButtonGroup>
        </div>
      </>
    ),
  } = props;

  return (
    <>
      <MeteorsBackground gridSize={120} meteorCount={3} />
      <div className="home-layout-container">
        <BaseHomeLayout
          {...props}
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
    page.pagePath.startsWith('en/lynx-ui') ||
    page.pagePath.startsWith('zh/lynx-ui') ||
    page.pagePath.startsWith('lynx-ui')
  ) {
    return (
      <div className="lynx-ui-home-layout-container">
        <LynxUIHomeLayout />
      </div>
    );
  }

  return <MainHomeLayout {...props} />;
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
  return (
    <BaseLink
      href={href}
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
