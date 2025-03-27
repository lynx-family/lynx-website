import { Spin, Typography } from '@douyinfe/semi-ui';
import React, { useEffect, useRef, useState } from 'react';

interface WebIframeProps {
  show: boolean;
  src: string;
}

const previewBaseUrl =
  'https://www.unpkg.com/@lynx-js/web-explorer-canary@0.0.2-canary-20250304-bbe8a143/index.html';

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
      className="sh-w-full sh-h-full sh-relative sh-flex sh-items-center sh-justify-center"
      style={{ display: show ? 'flex' : 'none' }}
    >
      {hasBeenVisible && (
        <iframe
          src={previewBaseUrl}
          ref={iframeRef}
          className="sh-w-full sh-h-full"
        />
      )}
      {loading && (
        <div className="sh-absolute sh-top-0 sh-left-0 sh-w-full sh-h-full sh-flex sh-items-center sh-justify-center">
          <Spin />
        </div>
      )}
      {error && (
        <div className="sh-absolute sh-top-0 sh-left-0 sh-w-full sh-h-full sh-flex sh-items-center sh-justify-center">
          <Typography.Text
            type="tertiary"
            style={{ padding: '0 12px', textAlign: 'center' }}
          >
            Failed to load the preview, please try again later.
          </Typography.Text>
        </div>
      )}
    </div>
  );
};
