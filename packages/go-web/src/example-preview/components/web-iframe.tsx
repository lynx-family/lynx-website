import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import '@lynx-js/web-core/index.css';
import '@lynx-js/web-elements/index.css';
import type { LynxView } from '@lynx-js/web-core';

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
const WEBPACK_PUBLIC_PATH_RE = /\.p=\\"\.\\"/g;

/**
 * Rewrite CSS viewport units (vh/vw) in a Lynx template's styleInfo to use
 * CSS custom properties (--lynx-vh / --lynx-vw). This fixes viewport-unit
 * sizing inside the <lynx-view> shadow DOM, where native CSS vh/vw resolve
 * to the browser viewport rather than the preview container.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rewriteViewportUnits(template: any): void {
  if (!template.styleInfo) return;

  const rewrite = (value: string) =>
    value
      .replace(/(-?\d+\.?\d*)vh/g, (_, num) => {
        const n = Number.parseFloat(num);
        if (n === 100) return 'var(--lynx-vh, 100vh)';
        return `calc(var(--lynx-vh, 100vh) * ${n / 100})`;
      })
      .replace(/(-?\d+\.?\d*)vw/g, (_, num) => {
        const n = Number.parseFloat(num);
        if (n === 100) return 'var(--lynx-vw, 100vw)';
        return `calc(var(--lynx-vw, 100vw) * ${n / 100})`;
      });

  for (const key of Object.keys(template.styleInfo)) {
    const info = template.styleInfo[key];
    if (info.content) {
      info.content = info.content.map((s: string) => rewrite(s));
    }
    if (info.rules) {
      for (const rule of info.rules) {
        if (rule.decl) {
          rule.decl = rule.decl.map(([prop, val]: [string, string]) => [
            prop,
            rewrite(val),
          ]);
        }
      }
    }
  }
}

export const WebIframe = ({ show, src }: WebIframeProps) => {
  const lynxViewRef = useRef<LynxView>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // IntersectionObserver — only activate when near viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load web-core + web-elements only when visible, then mark ready
  useEffect(() => {
    if (isVisible) {
      ensureRuntime().then(() => setReady(true));
    }
  }, [isVisible]);

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

      // Map CSS viewport units to the preview container dimensions.
      // In shadow DOM, native vh/vw resolve to the browser viewport,
      // not the lynx-view container. We define custom properties and
      // rewrite the bundle CSS to reference them instead.
      // @ts-ignore
      lynxViewRef.current.injectStyleRules = [
        `:host { --lynx-vh: ${containerHeight}px; --lynx-vw: ${containerWidth}px; }`,
      ];

      // Rewrite webpack's public path in the bundle JS so that asset
      // URLs (images etc.) resolve relative to the bundle location,
      // not the page URL.
      const baseUrl = src.substring(0, src.lastIndexOf('/') + 1);
      // @ts-ignore
      lynxViewRef.current.customTemplateLoader = async (url: string) => {
        const res = await fetch(url);
        const text = await res.text();
        // Replace webpack public path assignment (e.g. .p="/") with
        // the actual base URL of the bundle directory
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
            template.lepusCode.root = 'var __webpack_require__={p:"/"};' + root;
          }
        }

        // Rewrite vh/vw units in CSS to use container-relative custom properties
        rewriteViewportUnits(template);

        return template;
      };

      lynxViewRef.current.url = src;
    }
  }, [ready, show, src]);

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
      {isVisible && show && src && (
        <lynx-view
          ref={lynxViewRef}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
};
