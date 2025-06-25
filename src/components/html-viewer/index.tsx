import React, { useEffect } from 'react';
import { useLocation, usePageData } from 'rspress/runtime';
import styles from './index.module.less';

const doUpdataParentHash = (event: MessageEvent) => {
  try {
    const data = JSON.parse(event.data);

    if (data.src === 'living-spec') {
      window.history.replaceState({}, '', data.hash);
    }
  } catch (postError) {
    //
  }
};

function isRelativeUrl(url: string): boolean {
  return url.startsWith('/');
}

function formatUrlWithBase(url: string): string {
  const { siteData } = usePageData();
  const base = siteData?.base || '';
  return isRelativeUrl(url) && base !== '/' ? `${base}${url}` : url;
}

const HtmlViewer = ({ path }: { path: string }) => {
  const location = useLocation();
  const formattedPath = formatUrlWithBase(path);

  useEffect(() => {
    const rootContainer = document.querySelector('#root');

    if (rootContainer) {
      rootContainer.classList.add('html-viewer-root');

      window.addEventListener('message', doUpdataParentHash);
    }

    return () => {
      if (rootContainer) {
        rootContainer.classList.remove('html-viewer-root');

        window.removeEventListener('message', doUpdataParentHash);
      }
    };
  }, []);

  return (
    <div className={styles['html-viewer-frame']}>
      <iframe
        src={`${formattedPath}?ts=${Date.now()}${location.hash}`}
        className={styles['iframe-frame']}
      />
    </div>
  );
};

export { HtmlViewer };
