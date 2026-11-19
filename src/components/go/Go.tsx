import path from 'path';
import { useMemo } from 'react';
import { Go as GoBase, GoConfigProvider } from '@lynx-js/go-web';
import type { GoConfig, GoProps as GoBaseProps } from '@lynx-js/go-web';
import { rspressAdapter } from '@lynx-js/go-web/adapters/rspress';
import { ExamplePreviewSSG as SSGComponent } from '@lynx-js/go-web/ssg';
import { Callout } from '../Callout';

type GoProps = GoBaseProps & Pick<GoConfig, 'explorerText' | 'explorerUrl'>;

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
      '/zh/guide/start/quick-start#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator',
    en:
      process.env.LYNX_EXPLORER_URL_EN ||
      '/guide/start/quick-start#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator',
  },
  explorerText: process.env.LYNX_EXPLORER_TEXT || 'Lynx Explorer',
  ErrorComponent,
  SSGComponent,
};

function Go({ explorerText, explorerUrl, ...props }: GoProps) {
  const config = useMemo(
    () => ({
      ...baseConfig,
      explorerText: explorerText ?? baseConfig.explorerText,
      explorerUrl: {
        cn: explorerUrl?.cn ?? baseConfig.explorerUrl.cn,
        en: explorerUrl?.en ?? baseConfig.explorerUrl.en,
      },
      nativeFrameworks: {
        lynxtron: {
          learnMoreUrl: {
            en: '/lynxtron/go',
            cn: '/zh/lynxtron/go',
          },
          downloadUrl: resolveLynxtronDownloadUrl(),
        },
      },
    }),
    [explorerText, explorerUrl],
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

export { Go };
export type { GoProps };
