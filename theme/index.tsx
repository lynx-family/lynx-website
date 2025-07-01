import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, usePageData } from 'rspress/runtime';
import {
  HomeLayout as BaseHomeLayout,
  Layout as BaseLayout,
} from 'rspress/theme';
import { removeBase } from 'rspress/runtime';
import './index.scss';

import {
  Banner,
  Features,
  MeteorsBackground,
  ShowCase,
  Footer,
} from '@/components/home-comps';
import { SUBSITES_CONFIG } from '@site/shared-route-config';
import AfterNavTitle from './AfterNavTitle';
import BeforeSidebar from './BeforeSidebar';
import { useBlogBtnDom } from './hooks/use-blog-btn-dom';

function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    const subsite = SUBSITES_CONFIG.find((s) => pathname.includes(s.value));
    document.documentElement.setAttribute(
      'data-subsite',
      subsite ? subsite.value : 'guide',
    );
  }, [pathname]);

  return (
    <BaseLayout
      afterNavTitle={<AfterNavTitle />}
      beforeSidebar={<BeforeSidebar />}
      bottom={<Footer />}
    />
  );
}

const enSuffix = ' Native for More';
const enWords = ['Unlock', 'Render', 'Toward', 'Ship'];
const zhWords = ['迈向', '更快的', '更多平台的', '更多人的'];
const zhSuffix = '原生体验';

function HomeLayout() {
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
    const subsite = SUBSITES_CONFIG.find((s) => pathname.includes(s.value));
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

  return (
    <>
      <MeteorsBackground gridSize={120} meteorCount={3} />
      <div className="home-layout-container">
        <BaseHomeLayout
          afterHero={
            <>
              <Features src={routePath} />
              {routePath === '/' && <ShowCase />}
              {routePath === '/' && <Banner />}
            </>
          }
        />
      </div>
    </>
  );
}

export { HomeLayout, Layout };

export * from 'rspress/theme';
