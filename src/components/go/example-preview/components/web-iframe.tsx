import React, { useLayoutEffect, useRef } from 'react';
import '@lynx-js/web-core/index.css';
import '@lynx-js/web-core';
import '@lynx-js/web-elements/all';
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

export const WebIframe = ({ show, src }: WebIframeProps) => {
  const lynxViewRef = useRef<LynxView>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (lynxViewRef.current && src && show && containerRef.current) {
      // @ts-ignore
      lynxViewRef.current.browserConfig = {
        pixelWidth: Math.round(
          containerRef.current.clientWidth * window.devicePixelRatio,
        ),
        pixelHeight: Math.round(
          containerRef.current.clientHeight * window.devicePixelRatio,
        ),
      };
      lynxViewRef.current.url = src;
    }
  }, [lynxViewRef.current, src, show]);

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
      {show && src && (
        <lynx-view
          ref={lynxViewRef}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
};
