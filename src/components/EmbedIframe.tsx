import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDark } from '@rspress/core/runtime';

type Theme = 'light' | 'dark';

export interface EmbedIframeProps {
  src: string | ((theme: Theme) => string);
  title: string;
  height?: CSSProperties['height'];
  /** Fit same-origin content to its body height, with `height` as a fallback. */
  autoHeight?: boolean;
}

export function EmbedIframe({
  src,
  title,
  height = 500,
  autoHeight = false,
}: EmbedIframeProps) {
  const isDark = useDark();
  const theme = isDark ? 'dark' : 'light';
  const iframeSrc = typeof src === 'function' ? src(theme) : src;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeight, setContentHeight] = useState<{
    src: string;
    height: number;
  }>();

  useEffect(() => {
    if (!autoHeight) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    let observer: ResizeObserver | undefined;

    const observe = () => {
      observer?.disconnect();
      const body = iframe.contentDocument?.body;
      if (!body) return;
      const measure = () => {
        // Include the wrapper's borders without measuring the iframe viewport.
        const measured = Math.ceil(body.getBoundingClientRect().height) + 2;
        if (measured <= 2) return;
        setContentHeight((previous) =>
          previous?.src === iframeSrc && previous.height === measured
            ? previous
            : { src: iframeSrc, height: measured },
        );
      };
      observer = new ResizeObserver(measure);
      observer.observe(body);
      measure();
    };

    iframe.addEventListener('load', observe);
    observe();
    return () => {
      iframe.removeEventListener('load', observe);
      observer?.disconnect();
    };
  }, [autoHeight, iframeSrc]);

  return (
    <div
      style={{
        overflow: 'hidden',
        height:
          autoHeight && contentHeight?.src === iframeSrc
            ? contentHeight.height
            : height,
        position: 'relative',
        borderRadius: '8px',
        border: '1px solid var(--semi-color-border)',
        boxSizing: 'border-box',
      }}
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title={title}
        sandbox="allow-scripts allow-same-origin"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
}
