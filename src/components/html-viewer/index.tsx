import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, withBase } from '@rspress/core/runtime';
import styles from './index.module.less';

const doUpdataParentHash = (
  event: MessageEvent,
  updateHash: (hash: string) => void,
) => {
  try {
    const data = JSON.parse(event.data);

    if (data.src === 'living-spec') {
      window.history.replaceState({}, '', data.hash);
      updateHash(data.hash);
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
  const [currentHash, setCurrentHash] = useState(location.hash);
  const [initialHash] = useState(location.hash);
  const formattedPath = formatUrlWithBase(path);
  const iframeSrc = useMemo(
    () => `${formattedPath}?ts=${Date.now()}${initialHash}`,
    [formattedPath, initialHash],
  );

  useEffect(() => {
    const rootContainer = document.querySelector('#root');
    const onMessage = (event: MessageEvent) =>
      doUpdataParentHash(event, setCurrentHash);

    if (rootContainer) {
      rootContainer.classList.add('html-viewer-root');

      window.addEventListener('message', onMessage);
    }

    return () => {
      if (rootContainer) {
        rootContainer.classList.remove('html-viewer-root');

        window.removeEventListener('message', onMessage);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentHash(location.hash);
  }, [location.hash]);

  return (
    <div className={styles['html-viewer-frame']}>
      <a
        href={`${formattedPath}${currentHash}`}
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
