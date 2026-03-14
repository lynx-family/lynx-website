import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@douyinfe/semi-ui/dist/css/semi.min.css';
import { GoConfigProvider, Go } from '../../src/index';
import { StandaloneRuntimeProvider } from './adapters/rspress-runtime';
import type { PreviewTab, GoConfig } from '../../src/config';
import './styles.css';

type Lang = 'en' | 'zh';

// Build-time injected list of available examples (from docs/public/lynx-examples/)
declare global {
  interface ImportMeta {
    env: { EXAMPLES: string[] };
  }
}
const EXAMPLES: string[] = import.meta.env.EXAMPLES ?? ['hello-world'];

// ---------------------------------------------------------------------------
// URL State Persistence (inspired by rscexplorer)
// Encodes storyboard controls in the URL hash so links are shareable.
// ---------------------------------------------------------------------------

interface UrlState {
  dark?: boolean;
  lang?: Lang;
  tab?: PreviewTab;
  file?: string;
  example?: string;
}

function readUrlState(): UrlState {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return {};
    return JSON.parse(decodeURIComponent(hash));
  } catch {
    return {};
  }
}

function writeUrlState(state: UrlState) {
  const cleaned = Object.fromEntries(
    Object.entries(state).filter(([, v]) => v !== undefined),
  );
  const hash = encodeURIComponent(JSON.stringify(cleaned));
  window.history.replaceState(null, '', `#${hash}`);
}

// ---------------------------------------------------------------------------
// Error Boundary (inspired by rscexplorer's PreviewErrorBoundary)
// Catches render errors inside Go without crashing the storyboard.
// ---------------------------------------------------------------------------

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <strong>Preview Error</strong>
          <pre>{this.state.error.message}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="error-retry"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const initial = useMemo(() => readUrlState(), []);

  const [lang, setLang] = useState<Lang>(initial.lang ?? 'en');
  const [dark, setDark] = useState(
    () =>
      initial.dark ?? window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [defaultTab, setDefaultTab] = useState<PreviewTab>(
    initial.tab ?? 'web',
  );
  const [exampleBasePath, setExampleBasePath] = useState('/lynx-examples');
  const [example, setExample] = useState(initial.example ?? 'hello-world');
  const [defaultFile, setDefaultFile] = useState(initial.file ?? 'src/App.tsx');

  // Persist state to URL hash
  useEffect(() => {
    writeUrlState({ dark, lang, tab: defaultTab, file: defaultFile, example });
  }, [dark, lang, defaultTab, defaultFile, example]);

  // Apply Semi UI dark/light mode
  useEffect(() => {
    document.body.setAttribute('theme-mode', dark ? 'dark' : '');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);

  // Sync with system preference (only if user hasn't explicitly set via URL)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+D toggles dark mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setDark((d) => !d);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      // Brief visual feedback
      const btn = document.querySelector('.share-btn') as HTMLButtonElement;
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = orig;
        }, 1500);
      }
    });
  }, []);

  const goConfig: GoConfig = {
    exampleBasePath,
    defaultTab,
    explorerUrl: {
      en: 'https://lynxjs.org/guide/start/quick-start.html#download-lynx-explorer',
      cn: 'https://lynxjs.org/zh/guide/start/quick-start.html#download-lynx-explorer',
    },
    explorerText: 'Lynx Explorer',
  };

  return (
    <div className="storyboard">
      <header className="storyboard-header">
        <div className="header-row">
          <div>
            <h1>Go Web — Standalone Example</h1>
            <p className="subtitle">
              Interactive storyboard proving all decoupled APIs work without
              rspress
            </p>
          </div>
          <button
            className="share-btn"
            onClick={copyShareLink}
            title="Copy shareable URL with current settings"
          >
            Share Link
          </button>
        </div>
      </header>

      <div className="controls">
        <label>
          <span>Dark Mode</span>
          <button
            className={`toggle ${dark ? 'active' : ''}`}
            onClick={() => setDark((d) => !d)}
            title="Toggle dark mode (Cmd+D)"
          >
            {dark ? '🌙 Dark' : '☀️ Light'}
          </button>
        </label>

        <label>
          <span>Language</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </label>

        <label>
          <span>Default Tab</span>
          <select
            value={defaultTab}
            onChange={(e) => setDefaultTab(e.target.value as PreviewTab)}
          >
            <option value="web">Web (live preview)</option>
            <option value="qrcode">QR Code</option>
            <option value="preview">Preview (screenshot)</option>
          </select>
        </label>

        <label>
          <span>Default File</span>
          <input
            type="text"
            value={defaultFile}
            onChange={(e) => setDefaultFile(e.target.value)}
            style={{ width: '130px' }}
          />
        </label>

        <label>
          <span>Example</span>
          <select
            value={example}
            onChange={(e) => {
              setExample(e.target.value);
              setDefaultFile('src/App.tsx');
            }}
            style={{ width: '160px' }}
          >
            {EXAMPLES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <main className="go-container">
        <PreviewErrorBoundary>
          <StandaloneRuntimeProvider lang={lang} dark={dark}>
            <GoConfigProvider config={goConfig}>
              <Go
                key={`${example}-${defaultTab}`}
                example={example}
                defaultFile={defaultFile}
                defaultTab={defaultTab}
              />
            </GoConfigProvider>
          </StandaloneRuntimeProvider>
        </PreviewErrorBoundary>
      </main>

      <footer className="storyboard-footer">
        <kbd>⌘D</kbd> dark mode
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
