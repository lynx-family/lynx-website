import path from 'path';
import { useEffect, useMemo, useRef } from 'react';
import { Go as GoBase, GoConfigProvider } from '@lynx-js/go-web';
import type { GoProps } from '@lynx-js/go-web';
import { rspressAdapter } from '@lynx-js/go-web/adapters/rspress';
import { ExamplePreview as SSGComponent } from './example-preview-ssg';
import { attachAutoGesture } from './attach-auto-gesture';
import type { AutoGestureOptions } from './auto-gesture';
import Callout from '../Callout';

const ErrorComponent = ({
  example,
  exampleBaseUrl,
}: {
  example: string;
  exampleBaseUrl: string;
}) => (
  <Callout type="danger" title="Error Loading Example Data">
    <p>
      Error loading Example data for example: <code>{example}</code>
      <br />
      Please check if the file <code>example-metadata.json</code> exists in{' '}
      <code>
        {exampleBaseUrl}/{example}
      </code>{' '}
      .
    </p>
  </Callout>
);

// Lynxtron Go is a desktop-only host, so `downloadUrl` needs to distinguish
// supported desktop platforms from mobile, Linux, ChromeOS, and SSR. The
// Windows installer has a stable asset name. macOS user agents do not reliably
// expose Apple Silicon vs Intel, so send macOS users to the release page rather
// than risking an automatic download of the arm64-only .dmg.
const LYNXTRON_RELEASE_URL =
  'https://github.com/lynx-community/lynxtron-examples/releases/latest';
const LYNXTRON_DOWNLOAD_URL_WIN =
  'https://github.com/lynx-community/lynxtron-examples/releases/latest/download/LynxtronGo-win-x64-Setup.exe';

function resolveLynxtronDownloadUrl(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const { userAgent } = navigator;
  if (/Android|Mobile|iPhone|iPad|iPod/i.test(userAgent)) return undefined;
  if (/Windows NT/i.test(userAgent)) return LYNXTRON_DOWNLOAD_URL_WIN;
  if (/Macintosh|Mac OS X/i.test(userAgent)) return LYNXTRON_RELEASE_URL;
  return undefined;
}

const baseConfig = {
  ...rspressAdapter,
  exampleBasePath: '/lynx-examples',
  ssgExampleRoot: path?.join?.(__dirname, '../../docs/public/lynx-examples'),
  explorerUrl: {
    cn:
      process.env.LYNX_EXPLORER_URL_CN ||
      '/zh/guide/start/quick-start.html#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator',
    en:
      process.env.LYNX_EXPLORER_URL_EN ||
      '/guide/start/quick-start.html#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator',
  },
  explorerText: process.env.LYNX_EXPLORER_TEXT || 'Lynx Explorer',
  ErrorComponent,
  SSGComponent,
};

type Props = GoProps & {
  /**
   * Demonstrate a gesture-driven example with simulated touches once its web
   * preview has painted. A carousel that binds `touchstart`/`touchmove`/
   * `touchend` shows nothing to a desktop reader otherwise — a mouse never
   * produces those events, so the preview reads as a still image.
   *
   * This wraps the preview and drives the `<lynx-view>` from outside, because
   * the published `@lynx-js/go-web` has no prop for it yet. See
   * `attach-auto-gesture.ts`.
   */
  autoGesture?: AutoGestureOptions;
};

export function Go({ autoGesture, ...props }: Props) {
  const host = useRef<HTMLDivElement>(null);
  // Read through a ref so an inline options object does not restart playback
  // on every render of the surrounding page.
  const options = useRef(autoGesture);
  options.current = autoGesture;
  useEffect(() => {
    if (!host.current || !options.current) return;
    return attachAutoGesture(host.current, options.current);
  }, []);

  const config = useMemo(
    () => ({
      ...baseConfig,
      nativeFrameworks: {
        lynxtron: {
          downloadUrl: resolveLynxtronDownloadUrl(),
        },
      },
    }),
    [],
  );

  return (
    <GoConfigProvider config={config}>
      {autoGesture ? (
        <div ref={host}>
          <GoBase {...props} />
        </div>
      ) : (
        <GoBase {...props} />
      )}
    </GoConfigProvider>
  );
}

export type { GoProps };
export default Go;
