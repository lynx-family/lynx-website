import React, { useEffect } from 'react';
import { useLocation, withBase } from '@rspress/core/runtime';
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

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('/');
}

function formatUrlWithBase(url: string): string {
  return isAbsoluteUrl(url) ? withBase(url) : url;
}

const HtmlViewer = ({ path }: { path: string }) => {
  const location = useLocation();
  const formattedPath = formatUrlWithBase(path);
  const iframeSrc = `${formattedPath}?ts=${Date.now()}${location.hash}`;

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
      <a
        href={formattedPath}
        target="_blank"
        rel="noopener noreferrer"
        className={styles['open-external']}
        title="Open in new tab"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-9A1.5 1.5 0 0 1 3.5 3H8" />
          <path d="M10 1h5v5" />
          <path d="M7 9 14.5 1.5" />
        </svg>
      </a>
      <iframe src={iframeSrc} className={styles['iframe-frame']} />
    </div>
  );
};

export { HtmlViewer };
