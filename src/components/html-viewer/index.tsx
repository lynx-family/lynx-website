import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, withBase } from '@rspress/core/runtime';
import styles from './index.module.less';

// The living spec iframe posts `{ src: 'living-spec', hash }` whenever a
// reader follows an in-document fragment link (see scripts/lynx-living-spec.js).
function readLivingSpecHash(data: unknown): string | undefined {
  if (typeof data !== 'string') {
    return undefined;
  }

  try {
    const message = JSON.parse(data);

    if (
      message?.src === 'living-spec' &&
      typeof message.hash === 'string' &&
      (message.hash === '' || message.hash.startsWith('#'))
    ) {
      return message.hash;
    }
  } catch {
    // Ignore messages that are not living-spec hash updates.
  }

  return undefined;
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('/');
}

function formatUrlWithBase(url: string): string {
  return isAbsoluteUrl(url) ? withBase(url) : url;
}

interface HtmlViewerProps {
  path: string;
}

const HtmlViewer = ({ path }: HtmlViewerProps) => {
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const formattedPath = formatUrlWithBase(path);
  // The document hash currently shown in the iframe. It starts from the route
  // hash and follows in-document navigation reported by the iframe, so the
  // external link opens the same section the reader is looking at.
  const [documentHash, setDocumentHash] = useState(location.hash);
  // Keep the iframe source stable across re-renders; only a route change
  // should reload the embedded document.
  const iframeSrc = useMemo(
    () => `${formattedPath}?ts=${Date.now()}${location.hash}`,
    [formattedPath, location.hash],
  );
  const externalHref = `${formattedPath}${documentHash}`;

  useEffect(() => {
    setDocumentHash(location.hash);
  }, [location.hash]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const hash = readLivingSpecHash(event.data);

      if (hash === undefined) {
        return;
      }

      const { pathname, search } = window.location;
      window.history.replaceState(
        window.history.state,
        '',
        `${pathname}${search}${hash}`,
      );
      setDocumentHash(hash);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const rootContainer = document.querySelector('#root');

    rootContainer?.classList.add('html-viewer-root');

    return () => {
      rootContainer?.classList.remove('html-viewer-root');
    };
  }, []);

  return (
    <div className={styles['html-viewer-frame']}>
      <a
        href={externalHref}
        target="_blank"
        rel="noopener noreferrer"
        className={styles['open-external']}
        title="Open in new tab"
        aria-label="Open in new tab"
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
          aria-hidden="true"
          focusable="false"
        >
          <path d="M14 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-9A1.5 1.5 0 0 1 3.5 3H8" />
          <path d="M10 1h5v5" />
          <path d="M7 9 14.5 1.5" />
        </svg>
      </a>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className={styles['iframe-frame']}
      />
    </div>
  );
};

export { HtmlViewer };
export type { HtmlViewerProps };
