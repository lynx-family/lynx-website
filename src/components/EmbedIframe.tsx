import type { CSSProperties } from 'react';
import { useDark } from '@rspress/core/runtime';

type Theme = 'light' | 'dark';

export interface EmbedIframeProps {
  src: string | ((theme: Theme) => string);
  title: string;
  height?: CSSProperties['height'];
}

export function EmbedIframe({ src, title, height = 500 }: EmbedIframeProps) {
  const isDark = useDark();
  const theme = isDark ? 'dark' : 'light';
  const iframeSrc = typeof src === 'function' ? src(theme) : src;

  return (
    <div
      style={{
        overflow: 'hidden',
        height,
        position: 'relative',
        borderRadius: '8px',
        border: '1px solid var(--semi-color-border)',
        boxSizing: 'border-box',
      }}
    >
      <iframe
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
