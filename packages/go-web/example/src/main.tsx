import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@douyinfe/semi-ui/dist/css/semi.min.css';
import { GoConfigProvider, Go } from '../../src/index';
import { StandaloneRuntimeProvider } from './adapters/rspress-runtime';
import type { PreviewTab, GoConfig } from '../../src/config';
import './styles.css';

const LOGO_LIGHT =
  'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-dark-logo.svg';
const LOGO_DARK =
  'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-light-logo.svg';

type Lang = 'en' | 'zh';

// Build-time injected list of available examples
declare global {
  interface ImportMeta {
    env: { EXAMPLES: string[] };
  }
}
const EXAMPLES: string[] = import.meta.env.EXAMPLES ?? ['hello-world'];

// ---------------------------------------------------------------------------
// URL State Persistence
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
// Error Boundary
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
// UI primitives — SegmentedControl + ControlGroup (Mumbai v1 style)
// ---------------------------------------------------------------------------

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: 'var(--sb-text-dim)',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 6,
        border: '1px solid var(--sb-border)',
        overflow: 'hidden',
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '3px 10px',
            border: 'none',
            borderRight: '1px solid var(--sb-border)',
            background:
              value === opt.value ? 'var(--sb-accent)' : 'transparent',
            color: value === opt.value ? '#fff' : 'var(--sb-text-dim)',
            fontSize: 11,
            fontFamily: 'inherit',
            cursor: 'pointer',
            fontWeight: value === opt.value ? 600 : 400,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CopiedToast({ visible }: { visible: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: 'var(--sb-accent)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s',
        marginLeft: 4,
      }}
    >
      Copied!
    </span>
  );
}

// Custom select styling matching Mumbai v1
const selectStyle: React.CSSProperties = {
  padding: '3px 24px 3px 8px',
  borderRadius: 6,
  border: '1px solid var(--sb-border)',
  background: 'transparent',
  color: 'inherit',
  fontSize: 12,
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 6px center',
};

const inputStyle: React.CSSProperties = {
  width: 120,
  padding: '3px 8px',
  borderRadius: 6,
  border: '1px solid var(--sb-border)',
  background: 'transparent',
  color: 'inherit',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
};

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
  const [example, setExample] = useState(initial.example ?? 'hello-world');
  const [defaultFile, setDefaultFile] = useState(initial.file ?? 'src/App.tsx');
  const [copied, setCopied] = useState(false);

  // Persist state to URL hash
  useEffect(() => {
    writeUrlState({ dark, lang, tab: defaultTab, file: defaultFile, example });
  }, [dark, lang, defaultTab, defaultFile, example]);

  // Apply Semi UI dark/light mode
  useEffect(() => {
    document.body.setAttribute('theme-mode', dark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);

  // Sync with system preference
  useEffect(() => {
    if (initial.dark != null) return;
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
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const goConfig: GoConfig = {
    exampleBasePath: '/lynx-examples',
    defaultTab,
    explorerUrl: {
      en: 'https://lynxjs.org/guide/start/quick-start.html#download-lynx-explorer',
      cn: 'https://lynxjs.org/zh/guide/start/quick-start.html#download-lynx-explorer',
    },
    explorerText: 'Lynx Explorer',
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* ── Header (Mumbai v1 style) ── */}
      <header
        style={{
          marginBottom: 20,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'var(--sb-surface)',
          border: '1px solid var(--sb-border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 24px',
          alignItems: 'center',
          fontSize: 13,
          fontFamily: 'var(--sb-font-mono)',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginRight: 'auto',
          }}
        >
          <img
            src={dark ? LOGO_DARK : LOGO_LIGHT}
            alt="Lynx"
            style={{ height: 20 }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.5px',
              color: 'var(--sb-text-dim)',
            }}
          >
            {'<GO>'}
          </span>
        </span>

        <ControlGroup label="Example">
          <select
            value={example}
            onChange={(e) => {
              setExample(e.target.value);
              setDefaultFile('src/App.tsx');
            }}
            style={selectStyle}
          >
            {EXAMPLES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </ControlGroup>

        <ControlGroup label="Theme">
          <SegmentedControl
            value={dark ? 'dark' : 'light'}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(v) => setDark(v === 'dark')}
          />
        </ControlGroup>

        <ControlGroup label="Lang">
          <SegmentedControl
            value={lang}
            options={[
              { value: 'en', label: 'EN' },
              { value: 'zh', label: '中文' },
            ]}
            onChange={(v) => setLang(v as Lang)}
          />
        </ControlGroup>

        <ControlGroup label="Tab">
          <SegmentedControl
            value={defaultTab}
            options={[
              { value: 'web', label: 'Web' },
              { value: 'qrcode', label: 'QR' },
            ]}
            onChange={(v) => setDefaultTab(v as PreviewTab)}
          />
        </ControlGroup>

        <ControlGroup label="File">
          <input
            type="text"
            value={defaultFile}
            onChange={(e) => setDefaultFile(e.target.value)}
            style={inputStyle}
          />
        </ControlGroup>

        <button
          onClick={copyShareLink}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--sb-border)',
            background: 'transparent',
            color: 'var(--sb-text-dim)',
            fontSize: 12,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Copy shareable URL (⌘D for dark mode)"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
          </svg>
          URL
          <CopiedToast visible={copied} />
        </button>
      </header>

      {/* ── Go component ── */}
      <main>
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
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
