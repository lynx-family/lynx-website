import path from 'path';
import { useEffect, useMemo, useRef } from 'react';
import { Go as GoBase, GoConfigProvider } from '@lynx-js/go-web';
import type { GoProps as GoBaseProps } from '@lynx-js/go-web';
import { rspressAdapter } from '@lynx-js/go-web/adapters/rspress';
import { ExamplePreview as SSGComponent } from './example-preview-ssg';
import Callout from '../Callout';

const SOURCE_MODE_MIN_HEIGHT = 160;
// Match Go's existing box height. Its source layout reserves 51 px for the
// content frame and footer, plus another 47 px when file tabs are visible.
const SOURCE_MODE_FALLBACK_MAX_HEIGHT = 618;
const SOURCE_MODE_CHROME_HEIGHT = 51;
const SOURCE_MODE_TAB_HEIGHT = 47;

export type GoProps = GoBaseProps & {
  /** Fixed source-panel height in pixels, clamped to its existing limits. */
  sourceHeight?: number;
};

function pixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countCodeLines(code: HTMLElement): number {
  const renderedLines = code.querySelectorAll('span.line').length;
  if (renderedLines > 0) return renderedLines;

  const content = (code.textContent ?? '')
    .replace(/\r\n/gu, '\n')
    .replace(/\n+$/u, '');
  return content ? content.split('\n').length : 1;
}

function useAdaptiveSourceHeight(mode: GoProps['mode'], sourceHeight?: number) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (mode !== 'source' || !root) return;

    let animationFrame = 0;
    let box: HTMLElement | null = null;
    let disposed = false;
    let originalBoxHeight = '';
    let maximumHeight = SOURCE_MODE_FALLBACK_MAX_HEIGHT;
    const originalPreMinHeights = new Map<HTMLElement, string>();

    const updateHeight = () => {
      const nextBox = root.firstElementChild;
      const pre = root.querySelector<HTMLElement>('pre.shiki, pre');
      const code = pre?.querySelector<HTMLElement>('code');
      if (!(nextBox instanceof HTMLElement) || !pre || !code) return;
      if (!(code.textContent ?? '').trim()) return;

      if (box !== nextBox) {
        if (box) box.style.height = originalBoxHeight;
        box = nextBox;
        originalBoxHeight = box.style.height;
        maximumHeight =
          Math.round(box.getBoundingClientRect().height) ||
          SOURCE_MODE_FALLBACK_MAX_HEIGHT;
      }

      if (!originalPreMinHeights.has(pre)) {
        originalPreMinHeights.set(pre, pre.style.minHeight);
      }
      pre.style.minHeight = '0px';

      const firstLine = code.querySelector<HTMLElement>('span.line');
      const codeStyle = getComputedStyle(firstLine ?? code);
      const preStyle = getComputedStyle(pre);
      const lineHeight =
        pixels(codeStyle.lineHeight) ||
        pixels(getComputedStyle(code).lineHeight) ||
        24;
      const codeHeight = countCodeLines(code) * lineHeight;
      const codePadding =
        pixels(preStyle.paddingTop) + pixels(preStyle.paddingBottom);
      const tabHeight = root.querySelector('.semi-tabs-bar')
        ? SOURCE_MODE_TAB_HEIGHT
        : 0;
      const adaptiveHeight = Math.ceil(
        codeHeight + codePadding + SOURCE_MODE_CHROME_HEIGHT + tabHeight,
      );
      const desiredHeight =
        sourceHeight !== undefined && Number.isFinite(sourceHeight)
          ? Math.round(sourceHeight)
          : adaptiveHeight;

      box.style.height = `${Math.min(
        maximumHeight,
        Math.max(SOURCE_MODE_MIN_HEIGHT, desiredHeight),
      )}px`;
    };

    const scheduleUpdate = () => {
      if (disposed) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateHeight);
    };

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    window.addEventListener('resize', scheduleUpdate);
    void document.fonts?.ready.then(scheduleUpdate);
    scheduleUpdate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      if (box) box.style.height = originalBoxHeight;
      for (const [pre, minHeight] of originalPreMinHeights) {
        pre.style.minHeight = minHeight;
      }
    };
  }, [mode, sourceHeight]);

  return rootRef;
}

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

export function Go({ sourceHeight, ...props }: GoProps) {
  const sourceRootRef = useAdaptiveSourceHeight(props.mode, sourceHeight);
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

  const content = (
    <GoConfigProvider config={config}>
      <GoBase {...props} />
    </GoConfigProvider>
  );

  if (props.mode !== 'source') return content;

  return (
    <div ref={sourceRootRef} style={{ width: '100%' }}>
      {content}
    </div>
  );
}

export default Go;
