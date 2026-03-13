import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import '@lynx-js/web-core/index.css';
import '@lynx-js/web-elements/index.css';
import type { LynxView } from '@lynx-js/web-core';
import { LoadingOverlay } from './loading-overlay';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lynx-view': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface WebIframeProps {
  show: boolean;
  src: string;
}

// Shared promise so multiple WebIframe instances don't re-import
let runtimeReady: Promise<void> | null = null;
function ensureRuntime() {
  if (!runtimeReady) {
    runtimeReady = Promise.all([
      import('@lynx-js/web-core'),
      import('@lynx-js/web-elements/all'),
    ]).then(() => {
      /* runtime loaded */
    });
  }
  return runtimeReady;
}

// Pre-compiled regex for webpack public path rewriting in customTemplateLoader
// Matches .p=\"<anything>\" — handles empty, single-char, and multi-char paths
const WEBPACK_PUBLIC_PATH_RE = /\.p=\\"[^"]*\\"/g;

export const WebIframe = ({ show, src }: WebIframeProps) => {
  const lynxViewRef = useRef<LynxView>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Reset rendered state when src changes
  useEffect(() => {
    setRendered(false);
  }, [src]);

  // Load web-core + web-elements eagerly on mount
  useEffect(() => {
    ensureRuntime().then(() => setReady(true));
  }, []);

  // Set URL only after runtime is ready AND element is mounted
  useEffect(() => {
    if (ready && show && src && lynxViewRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      // @ts-ignore
      lynxViewRef.current.browserConfig = {
        pixelWidth: Math.round(containerWidth * window.devicePixelRatio),
        pixelHeight: Math.round(containerHeight * window.devicePixelRatio),
      };

      // @ts-ignore
      lynxViewRef.current.customTemplateLoader = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to load template: ${url} (${res.status})`);
        }
        const text = await res.text();

        // Rewrite webpack's public path in the bundle JS so that asset
        // URLs (images etc.) resolve relative to the bundle location,
        // not the page URL.
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        const rewritten = text.replace(
          WEBPACK_PUBLIC_PATH_RE,
          `.p=\\"${baseUrl}\\"`,
        );
        const template = JSON.parse(rewritten);

        // Workaround: when no template modules reference publicPath (no asset
        // imports), rspack omits the local webpack runtime from lepusCode and
        // emits a bare `__webpack_require__` reference. Inject a minimal shim
        // so the entry-point executor (`__webpack_require__.x`) can run.
        if (template.lepusCode?.root) {
          const root = template.lepusCode.root;
          if (
            typeof root === 'string' &&
            root.includes('__webpack_require__') &&
            !root.includes('function __webpack_require__')
          ) {
            template.lepusCode.root =
              `var __webpack_require__={p:"${baseUrl}"};` + root;
          }
        }

        return template;
      };

      lynxViewRef.current.url = src;

      // Detect when lynx-view has rendered content via MutationObserver
      // on its shadow root
      const el = lynxViewRef.current as unknown as HTMLElement;
      const shadow = el.shadowRoot;
      let mo: MutationObserver | undefined;
      if (shadow) {
        mo = new MutationObserver(() => {
          if (shadow.childElementCount > 0) {
            setRendered(true);
            mo?.disconnect();
          }
        });
        mo.observe(shadow, { childList: true, subtree: true });
      }

      // Fallback: hide loading after timeout
      const timer = setTimeout(() => setRendered(true), 5000);
      return () => {
        clearTimeout(timer);
        mo?.disconnect();
      };
    }
  }, [ready, show, src]);

  const loading = show && (!ready || !rendered);

  return (
    <div
      ref={containerRef}
      style={{
        display: show ? 'flex' : 'none',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <LoadingOverlay visible={loading} />
      {show && src && (
        <lynx-view
          ref={lynxViewRef}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
};
