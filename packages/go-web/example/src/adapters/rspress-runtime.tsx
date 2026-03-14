/**
 * Standalone replacement for `@rspress/core/runtime`.
 *
 * Provides the same API surface (useI18n, useLang, withBase, NoSSR, useDark)
 * without any rspress dependency — proving go-web can run standalone.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const translations: Record<string, Record<string, string>> = {
  en: {
    'go.preview': 'Preview',
    'go.qrcode': 'QRCode',
    'go.files': 'Files',
    'go.scan.message-1': 'Download ',
    'go.scan.message-2': 'and scan the QR code to get started.',
    'go.qrcode.copy-link': 'Copy Link',
    'go.qrcode.copied': 'Copied',
    'go.qrcode.entry': 'Entry',
  },
  zh: {
    'go.preview': '预览',
    'go.qrcode': '二维码',
    'go.files': '文件',
    'go.scan.message-1': '请下载 ',
    'go.scan.message-2': '扫描二维码预览',
    'go.qrcode.copy-link': '复制链接',
    'go.qrcode.copied': '已复制',
    'go.qrcode.entry': '入口',
  },
};

interface StandaloneRuntimeConfig {
  lang: string;
  dark: boolean;
}

const RuntimeContext = createContext<StandaloneRuntimeConfig>({
  lang: 'en',
  dark: false,
});

/**
 * Provider that the example app wraps around Go so that
 * useI18n / useLang / useDark work without rspress.
 */
export function StandaloneRuntimeProvider({
  lang,
  dark,
  children,
}: {
  lang: string;
  dark: boolean;
  children: React.ReactNode;
}) {
  return (
    <RuntimeContext.Provider value={{ lang, dark }}>
      {children}
    </RuntimeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Exports that mirror @rspress/core/runtime
// ---------------------------------------------------------------------------

export function useI18n() {
  const { lang } = useContext(RuntimeContext);
  return (key: string): string => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  };
}

export function useLang() {
  const { lang } = useContext(RuntimeContext);
  return lang;
}

export function useDark() {
  const { dark } = useContext(RuntimeContext);
  return dark;
}

/** Identity — no base path needed in standalone mode. */
export function withBase(path: string): string {
  return path;
}

/** In a SPA there's no SSR, so just render children. */
export function NoSSR({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : null;
}
