import path from 'path';
import { useMemo } from 'react';
import { withBase } from '@rspress/core/runtime';
import { Go as GoBase, GoConfigProvider } from '@lynx-js/go-web';
import type { GoProps } from '@lynx-js/go-web';
import { rspressAdapter } from '@lynx-js/go-web/adapters/rspress';
import { ExamplePreviewSSG as SSGComponent } from '@lynx-js/go-web/ssg';
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

export function Go(props: GoProps) {
  const config = useMemo(
    () => ({
      ...baseConfig,
      nativeFrameworks: {
        lynxtron: {
          learnMoreUrl: {
            // TODO: Remove site-level base resolution once go-web handles
            // nativeFrameworks URLs through its Rspress adapter.
            en: withBase('/lynxtron/go'),
            cn: withBase('/zh/lynxtron/go'),
          },
          downloadUrl: resolveLynxtronDownloadUrl(),
        },
      },
    }),
    [],
  );

  return (
    <GoConfigProvider config={config}>
      <GoBase
        {...props}
        langAlias={{
          cc: 'cpp',
          cxx: 'cpp',
          h: 'cpp',
          hh: 'cpp',
          hpp: 'cpp',
          hxx: 'cpp',
          m: 'objective-c',
          mm: 'objective-cpp',
          ...props.langAlias,
        }}
      />
    </GoConfigProvider>
  );
}

export type { GoProps };
export default Go;
