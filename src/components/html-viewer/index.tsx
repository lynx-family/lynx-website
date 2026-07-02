import React, { useEffect } from 'react';
import { useI18n, useLocation, withBase } from '@rspress/core/runtime';
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
  const t = useI18n();
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

  const iframeSrc = `${formattedPath}?ts=${Date.now()}${location.hash}`;

  return (
    <div className={styles['html-viewer-frame']}>
      <div className={styles['open-link-bar']}>
        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          className={styles['open-link']}
        >
          {t('html-viewer.open-in-new-tab')}
        </a>
      </div>
      <iframe
        src={iframeSrc}
        className={styles['iframe-frame']}
      />
    </div>
  );
};

export { HtmlViewer };
