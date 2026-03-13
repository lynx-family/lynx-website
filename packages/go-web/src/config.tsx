import type React from 'react';
import { createContext, useContext } from 'react';
import type { ExamplePreviewProps } from './example-preview';

export type PreviewTab = 'preview' | 'web' | 'qrcode';

export interface GoConfig {
  /** Base path for examples, e.g. '/lynx-examples' or '/examples' */
  exampleBasePath: string;
  /**
   * Default preview tab. Applies to all `<Go>` instances under this provider
   * unless overridden by the `defaultTab` prop on individual instances.
   *
   * - `'preview'` — static screenshot (requires `img`)
   * - `'web'`     — live web preview (requires `webFile` in metadata)
   * - `'qrcode'`  — QR code for Lynx Explorer
   *
   * When omitted, defaults to `'preview'` if an image is available,
   * otherwise `'qrcode'`.
   */
  defaultTab?: PreviewTab;
  /** Explorer URLs for QR code scanning instructions */
  explorerUrl?: {
    cn?: string;
    en?: string;
  };
  /** Explorer app name, defaults to 'Lynx Explorer' */
  explorerText?: string;
  /** Custom error component for failed example loading */
  ErrorComponent?: React.ComponentType<{
    example: string;
    exampleBaseUrl: string;
  }>;
  /** SSG rendering component, used when import.meta.env.SSG_MD is true */
  SSGComponent?: React.ComponentType<ExamplePreviewProps>;
}

const defaultConfig: GoConfig = {
  exampleBasePath: '/lynx-examples',
};

const GoConfigContext = createContext<GoConfig>(defaultConfig);

export function GoConfigProvider({
  config,
  children,
}: {
  config: GoConfig;
  children: React.ReactNode;
}) {
  return (
    <GoConfigContext.Provider value={config}>
      {children}
    </GoConfigContext.Provider>
  );
}

export function useGoConfig(): GoConfig {
  return useContext(GoConfigContext);
}
