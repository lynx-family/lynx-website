import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

const panelLabelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'var(--sb-text-dim)',
  whiteSpace: 'nowrap',
};

const panelInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 'auto',
};

// ---------------------------------------------------------------------------
// JSX snippet builder (for copy-to-clipboard)
// ---------------------------------------------------------------------------

function buildJsxString({
  example,
  defaultFile,
  defaultTab,
  defaultEntryFile,
  entryFilter,
  highlight,
  img,
  schema,
}: {
  example: string;
  defaultFile: string;
  defaultTab: PreviewTab;
  defaultEntryFile: string;
  entryFilter: string;
  highlight: string;
  img: string;
  schema: string;
}): string {
  const props: string[] = [`example="${example}"`];
  if (defaultFile) props.push(`defaultFile="${defaultFile}"`);
  if (defaultTab !== 'web') props.push(`defaultTab="${defaultTab}"`);
  if (defaultEntryFile) props.push(`defaultEntryFile="${defaultEntryFile}"`);
  if (highlight) props.push(`highlight="${highlight}"`);
  if (entryFilter) {
    if (entryFilter.includes(',')) {
      props.push(
        `entry={${JSON.stringify(entryFilter.split(',').map((s) => s.trim()))}}`,
      );
    } else {
      props.push(`entry="${entryFilter}"`);
    }
  }
  if (schema) props.push(`schema="${schema}"`);
  if (img) props.push(`img="${img}"`);

  if (props.length <= 2) {
    return `<Go ${props.join(' ')} />`;
  }
  return `<Go\n${props.map((p) => `  ${p}`).join('\n')}\n/>`;
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
  const [example, setExample] = useState(initial.example ?? 'hello-world');
  const [defaultFile, setDefaultFile] = useState(initial.file ?? 'src/App.tsx');
  const [copied, setCopied] = useState(false);

  // Metadata & entry state
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState('');
  const [defaultEntryFile, setDefaultEntryFile] = useState('');
  const [entryFilter, setEntryFilter] = useState('');
  const [highlight, setHighlight] = useState('');
  const [img, setImg] = useState('');
  const [schema, setSchema] = useState('');
  const [propsOpen, setPropsOpen] = useState(true);
  const [jsxDialogOpen, setJsxDialogOpen] = useState(false);
  const [jsxCopied, setJsxCopied] = useState(false);
  const jsxPreRef = useRef<HTMLPreElement>(null);

  const jsxString = useMemo(
    () =>
      buildJsxString({
        example,
        defaultFile,
        defaultTab,
        defaultEntryFile,
        entryFilter,
        highlight,
        img,
        schema,
      }),
    [
      example,
      defaultFile,
      defaultTab,
      defaultEntryFile,
      entryFilter,
      highlight,
      img,
      schema,
    ],
  );

  const copyJsx = useCallback(() => {
    navigator.clipboard.writeText(jsxString);
    setJsxCopied(true);
    setTimeout(() => setJsxCopied(false), 1500);
  }, [jsxString]);

  // Auto-select code when JSX dialog opens
  useEffect(() => {
    if (jsxDialogOpen && jsxPreRef.current) {
      const range = document.createRange();
      range.selectNodeContents(jsxPreRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [jsxDialogOpen]);

  // Close dialog on Escape
  useEffect(() => {
    if (!jsxDialogOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setJsxDialogOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [jsxDialogOpen]);

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

  // Fetch example metadata when example changes
  useEffect(() => {
    setMetadata(null);
    setMetadataLoading(true);
    fetch(`/lynx-examples/${example}/example-metadata.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMetadata(data);
        const first = data.templateFiles?.[0];
        if (first) {
          setSelectedEntry(first.name);
          setDefaultEntryFile(first.file);
          if (data.templateFiles.length > 1) {
            setDefaultFile(`src/${first.name}/index.tsx`);
            setEntryFilter(`src/${first.name}`);
          } else {
            setEntryFilter('');
          }
        }
        setHighlight('');
        setImg(data.previewImage || '');
        setSchema('');
      })
      .catch(() => setMetadata(null))
      .finally(() => setMetadataLoading(false));
  }, [example]);

  const handleEntryChange = useCallback(
    (entryName: string) => {
      setSelectedEntry(entryName);
      const entry = metadata?.templateFiles?.find(
        (t: any) => t.name === entryName,
      );
      if (entry) {
        setDefaultEntryFile(entry.file);
        if (metadata!.templateFiles.length > 1) {
          setDefaultFile(`src/${entryName}/index.tsx`);
          setEntryFilter(`src/${entryName}`);
        }
      }
    },
    [metadata],
  );

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
      {/* ── Toolbar card (header + collapsible props) ── */}
      <div
        style={{
          marginBottom: 20,
          borderRadius: 10,
          background: 'var(--sb-surface)',
          border: '1px solid var(--sb-border)',
          overflow: 'hidden',
          fontSize: 13,
          fontFamily: 'var(--sb-font-mono)',
        }}
      >
        {/* Header row */}
        <header
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 24px',
            alignItems: 'center',
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

          {/* JSX button */}
          <button
            className="toolbar-btn"
            onClick={() => setJsxDialogOpen(true)}
            title="View JSX snippet"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="5 3 1 8 5 13" />
              <polyline points="11 3 15 8 11 13" />
            </svg>
            JSX
          </button>

          {/* URL copy button */}
          <button
            className="toolbar-btn"
            onClick={copyShareLink}
            title="Copy shareable URL"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
            </svg>
            URL
            <CopiedToast visible={copied} />
          </button>
        </header>

        {/* Props toggle bar */}
        <button
          onClick={() => setPropsOpen((v) => !v)}
          style={{
            width: '100%',
            padding: '8px 16px',
            border: 'none',
            borderTop: '1px solid var(--sb-border)',
            background: 'transparent',
            color: 'inherit',
            fontSize: 12,
            fontFamily: 'var(--sb-font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.15s',
              transform: propsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: 10,
            }}
          >
            ▶
          </span>
          Props
        </button>

        {/* Collapsible props content */}
        {propsOpen && (
          <div
            style={{
              borderTop: '1px solid var(--sb-border)',
              background: 'var(--sb-bg)',
              display: 'flex',
            }}
          >
            {/* Left: entry list */}
            <div
              style={{
                flex: '0 0 140px',
                padding: '10px 0 10px 12px',
                overflow: 'auto',
                maxHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <div
                style={{
                  ...panelLabelStyle,
                  padding: '0 4px',
                  marginBottom: 4,
                }}
              >
                Entries
              </div>
              {metadata?.templateFiles?.map((t: any) => (
                <button
                  key={t.name}
                  className="entry-list-btn"
                  data-active={selectedEntry === t.name}
                  onClick={() => handleEntryChange(t.name)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 5,
                    border: 'none',
                    background:
                      selectedEntry === t.name
                        ? 'var(--sb-accent)'
                        : 'transparent',
                    color:
                      selectedEntry === t.name ? '#fff' : 'var(--sb-text-dim)',
                    fontSize: 11,
                    fontFamily: 'var(--sb-font-mono)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.12s, color 0.12s',
                  }}
                >
                  {t.name}
                  {t.webFile ? '' : ' *'}
                </button>
              ))}
              {!metadata && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--sb-text-dim)',
                    padding: '3px 8px',
                  }}
                >
                  {metadataLoading ? 'Loading…' : '—'}
                </span>
              )}
            </div>

            {/* Middle: controls grid (2-up) */}
            <div
              style={{
                flex: '1 1 0',
                padding: '10px 16px',
                borderLeft: '1px solid var(--sb-border)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto 1fr',
                gap: '5px 10px',
                alignItems: 'center',
                alignContent: 'start',
              }}
            >
              <span style={panelLabelStyle}>File</span>
              <input
                type="text"
                value={defaultFile}
                onChange={(e) => setDefaultFile(e.target.value)}
                style={panelInputStyle}
              />

              <span style={panelLabelStyle}>Entry File</span>
              <input
                type="text"
                value={defaultEntryFile}
                onChange={(e) => setDefaultEntryFile(e.target.value)}
                style={panelInputStyle}
                placeholder="dist/main.lynx.bundle"
              />

              <span style={panelLabelStyle}>Entry Filter</span>
              <input
                type="text"
                value={entryFilter}
                onChange={(e) => setEntryFilter(e.target.value)}
                style={panelInputStyle}
                placeholder="src/sizing"
              />

              <span style={panelLabelStyle}>Highlight</span>
              <input
                type="text"
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                style={panelInputStyle}
                placeholder="{5-10}"
              />

              <span style={panelLabelStyle}>Img</span>
              <input
                type="text"
                value={img}
                onChange={(e) => setImg(e.target.value)}
                style={panelInputStyle}
                placeholder="https://..."
              />

              <span style={panelLabelStyle}>Schema</span>
              <input
                type="text"
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                style={panelInputStyle}
                placeholder="lynx://..."
              />
            </div>

            {/* Right: metadata JSON */}
            <div
              style={{
                flex: '0 0 33.3%',
                minWidth: 0,
                borderLeft: '1px solid var(--sb-border)',
                padding: '10px 16px',
                overflow: 'auto',
                maxHeight: 200,
              }}
            >
              <div style={{ ...panelLabelStyle, marginBottom: 8 }}>
                example-metadata.json
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.5,
                  fontFamily: 'var(--sb-font-mono)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: 'inherit',
                }}
              >
                {metadata
                  ? JSON.stringify(metadata, null, 2)
                  : metadataLoading
                    ? 'Loading…'
                    : 'No metadata'}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── Go component ── */}
      <main>
        <PreviewErrorBoundary>
          <StandaloneRuntimeProvider lang={lang} dark={dark}>
            <GoConfigProvider config={goConfig}>
              <Go
                key={`${example}-${selectedEntry}-${defaultTab}`}
                example={example}
                defaultFile={defaultFile}
                defaultTab={defaultTab}
                defaultEntryFile={defaultEntryFile || undefined}
                entry={entryFilter || undefined}
                highlight={highlight || undefined}
                img={img || undefined}
                schema={schema || undefined}
              />
            </GoConfigProvider>
          </StandaloneRuntimeProvider>
        </PreviewErrorBoundary>
      </main>

      {/* ── JSX dialog ── */}
      {jsxDialogOpen && (
        <div
          className="jsx-dialog-backdrop"
          onClick={() => setJsxDialogOpen(false)}
        >
          <div className="jsx-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="jsx-dialog-header">
              <span>JSX Snippet</span>
              <button
                className="jsx-dialog-close"
                onClick={() => setJsxDialogOpen(false)}
              >
                ×
              </button>
            </div>
            <pre ref={jsxPreRef}>{jsxString}</pre>
            <div className="jsx-dialog-footer">
              <button className="toolbar-btn" onClick={copyJsx}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
                  <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
                </svg>
                {jsxCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
