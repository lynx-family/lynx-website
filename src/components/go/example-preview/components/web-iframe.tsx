import React, { useLayoutEffect, useRef } from 'react';
import '@lynx-js/web-core/index.css';
import '@lynx-js/web-core';
import '@lynx-js/web-elements/all';
import '@lynx-js/web-elements/index.css';
import '@lynx-js/web-elements/compat/LinearContainer';
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

  useLayoutEffect(() => {
    if (lynxViewRef.current && src && show) {
      lynxViewRef.current.url = src;
    }
  }, [lynxViewRef.current, src, show]);

  return (
    <div
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
