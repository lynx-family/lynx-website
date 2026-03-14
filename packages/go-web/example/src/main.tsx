import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@douyinfe/semi-ui/dist/css/semi.min.css';
import { GoConfigProvider, Go } from '../../src/index';
import { StandaloneRuntimeProvider } from './adapters/rspress-runtime';
import type { PreviewTab, GoConfig } from '../../src/config';
import './styles.css';

type Lang = 'en' | 'zh';

function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [defaultTab, setDefaultTab] = useState<PreviewTab>('web');
  const [exampleBasePath, setExampleBasePath] = useState('/lynx-examples');

  // Apply Semi UI dark/light mode
  useEffect(() => {
    document.body.setAttribute('theme-mode', dark ? 'dark' : '');
    // Also set color-scheme for shiki dual-theme
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);

  // Sync with system preference
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
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
        <h1>Go Web — Standalone Example</h1>
        <p className="subtitle">
          Proving all decoupled APIs work without rspress
        </p>
      </header>

      <div className="controls">
        <label>
          <span>Dark Mode</span>
          <button
            className={`toggle ${dark ? 'active' : ''}`}
            onClick={() => setDark((d) => !d)}
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
          <span>Example Base Path</span>
          <input
            type="text"
            value={exampleBasePath}
            onChange={(e) => setExampleBasePath(e.target.value)}
            style={{ width: '160px' }}
          />
        </label>
      </div>

      <main className="go-container">
        <StandaloneRuntimeProvider lang={lang} dark={dark}>
          <GoConfigProvider config={goConfig}>
            <Go
              example="hello-world"
              defaultFile="src/App.tsx"
              defaultTab={defaultTab}
            />
          </GoConfigProvider>
        </StandaloneRuntimeProvider>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
