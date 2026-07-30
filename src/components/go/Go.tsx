import path from 'path';
import { useMemo } from 'react';
import { Go as GoBase, GoConfigProvider } from '@lynx-js/go-web';
import type { GoProps } from '@lynx-js/go-web';
import { rspressAdapter } from '@lynx-js/go-web/adapters/rspress';
import { ExamplePreview as SSGComponent } from './example-preview-ssg';
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

// Lynxtron Go is a desktop-only host, so `downloadUrl` needs to pick between
// the macOS .dmg and the Windows installer. go-web's `LocalizedUrl` only
// branches on language, so we resolve the OS here. The URL is never in the
// SSR HTML — it only renders after a client-side 5s deep-link probe — so
// reading `navigator` at render time is safe.
const LYNXTRON_DOWNLOAD_URL_MAC =
  'https://github.com/lynx-community/lynxtron-examples/releases/latest/download/lynxtron-go-darwin-arm64.dmg';
const LYNXTRON_DOWNLOAD_URL_WIN =
  'https://github.com/lynx-community/lynxtron-examples/releases/latest/download/LynxtronGo-win-x64-Setup.exe';

function resolveLynxtronDownloadUrl(): string {
  if (typeof navigator === 'undefined') return LYNXTRON_DOWNLOAD_URL_MAC;
  return /Windows/i.test(navigator.userAgent)
    ? LYNXTRON_DOWNLOAD_URL_WIN
    : LYNXTRON_DOWNLOAD_URL_MAC;
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

export function Go(props: GoProps) {
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
      <GoBase {...props} />
    </GoConfigProvider>
  );
}

export type { GoProps };
export default Go;
