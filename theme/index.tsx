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
} from '@rspress/core/theme';
import {
  Search as PluginAlgoliaSearch,
  ZH_LOCALES,
} from '@rspress/plugin-algolia/runtime';
import {
  LlmsContainer,
  LlmsCopyButton,
  LlmsViewOptions,
} from '@rspress/plugin-llms/runtime';
import { useCallback, useEffect, useMemo, useState } from 'react';

import './index.scss';

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

// Use word boundary (\b) to match complete words only (e.g., "react" matches but "reactive" doesn't)
const findSubsite = (pathname: string) => {
  return SUBSITES_CONFIG.find((s) =>
    new RegExp(`\\b${s.value}\\b`).test(pathname),
  );
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      htmlAttrs: unknown;
    }
  }
}

function Layout(props: Parameters<typeof BaseLayout>[0]) {
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
        afterNavTitle={<AfterNavTitle />}
        beforeSidebar={<BeforeSidebar />}
        bottom={<Footer />}
      />
    </>
  );
}

const enSuffix = ' Native for More';
const enWords = ['Unlock', 'Render', 'Toward', 'Ship'];
const zhWords = ['迈向', '更快的', '更多平台的', '更多人的'];
const zhSuffix = '原生体验';

function HomeLayout(props: Parameters<typeof BaseHomeLayout>[0]) {
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

  useBlogBtnDom(routePath);

  // Update theme based on URL
  useEffect(() => {
    const subsite = findSubsite(pathname);
    document.documentElement.setAttribute(
      'data-subsite',
      subsite ? subsite.value : 'guide',
    );
  }, [pathname]);

  const updateText = useCallback(() => {
    const h1Ele = document.querySelector('h1');
    const h1Span = document.querySelector('h1 > span');
    if (!h1Ele) return;
    if (!h1Span) return;

    // Add negative margin to h1 span to avoid text wrapping
    h1Ele.style.margin = '0 -100px';

    const words = isZh ? zhWords : enWords;
    const suffix = isZh ? zhSuffix : enSuffix;

    const currentWord = words[currentWordIndex];
    const currentLength = text.replace(suffix, '').length;
    const dynamicText = isDeleting
      ? currentWord.substring(0, currentLength - 1)
      : currentWord.substring(0, currentLength + 1);

    const fullText = `${dynamicText}${suffix}`;
    setText(fullText);

    const dynamicSpan = h1Span.querySelector('.dynamic-text');
    const suffixSpan = h1Span.querySelector('.suffix-text');

    if (!dynamicSpan || !suffixSpan) {
      h1Span.innerHTML = `
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

  // Rspress would pass `afterHero: undefined` and `afterHeroActions: undefined` props to HomeLayout,
  const {
    afterHero = (
      <>
        <Features src={routePath} /> {routePath === '/' && <ShowCase />}
        {routePath === '/' && <Banner />}
      </>
    ),
    afterHeroActions = (
      <div
        className="rp-doc"
        style={{ minHeight: 'auto', width: '100%', maxWidth: 300 }}
      >
        <PreWithCodeButtonGroup
          containerElementClassName="language-bash home-layout-create-block"
          codeButtonGroupProps={{
            showCodeWrapButton: false,
          }}
        >
          <Code
            className="language-bash home-layout-create-block"
            style={{ textAlign: 'center' }}
          >
            npm create rspeedy@latest
          </Code>
        </PreWithCodeButtonGroup>
      </div>
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

function getCustomMDXComponent() {
  const { h1: H1, ...mdxComponents } = basicGetCustomMDXComponent();

  const MyH1 = ({ ...props }: React.ComponentProps<typeof H1>) => {
    return (
      <>
        <H1 {...props} />
        <LlmsContainer>
          <LlmsCopyButton />
          <LlmsViewOptions />
        </LlmsContainer>
      </>
    );
  };
  return {
    ...mdxComponents,
    h1: MyH1,
  };
}

export { getCustomMDXComponent };

const Link = (props: React.ComponentProps<typeof BaseLink>) => {
  const { href, children, className, ...restProps } = props;
  const getLangPrefix = (lang: string) => (lang === 'en' ? '' : `/${lang}`);
  if (href && href.startsWith(`${getLangPrefix(useLang())}/blog`)) {
    return (
      <BaseLink
        href={`/next${removeBase(href)}`}
        className={`rp-link ${className}`}
        {...restProps}
      >
        {children}
      </BaseLink>
    );
  }
  return (
    <BaseLink href={href} className={className} {...restProps}>
      {children}
    </BaseLink>
  );
};

export { Link }; // override Link from @rspress/core/theme

export * from '@rspress/core/theme';
