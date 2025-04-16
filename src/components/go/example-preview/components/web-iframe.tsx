import React, { useEffect, useRef, useState } from 'react';
import { Spin, Typography } from '@douyinfe/semi-ui';

interface WebIframeProps {
  show: boolean;
  src: string;
}

const previewBaseUrl =
  'https://www.unpkg.com/@lynx-js/web-explorer-canary@0.0.7-canary-20250428-5ff7cd8c/index.html';

export const WebIframe = ({ show, src }: WebIframeProps) => {
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (show && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [show, hasBeenVisible]);

  useEffect(() => {
    if (hasBeenVisible) {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current?.addEventListener('load', () => {
          setLoading(false);
          iframeRef.current?.contentWindow?.postMessage(
            {
              method: 'setLynxViewUrl',
              url: `${src}?fullscreen=true`,
            },
            '*',
          );
        });
        iframeRef.current?.addEventListener('error', () => {
          setLoading(false);
          setError(true);
        });
      }
    }
  }, [hasBeenVisible]);

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
      {hasBeenVisible && (
        <iframe
          src={previewBaseUrl}
          ref={iframeRef}
          style={{ width: '100%', height: '100%' }}
        />
      )}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <Spin />
        </div>
      )}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <Typography.Text type="tertiary">
            Failed to load the preview, please try again later.
          </Typography.Text>
        </div>
      )}
    </div>
  );
};
