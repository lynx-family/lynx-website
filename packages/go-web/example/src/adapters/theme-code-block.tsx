/**
 * Standalone replacement for rspress `@theme` CodeBlockRuntime.
 *
 * Uses shiki directly for syntax highlighting — the same engine
 * rspress uses under the hood, minus the rspress framework coupling.
 */
import { useEffect, useRef, useState } from 'react';
import type { ShikiTransformer, BundledLanguage } from 'shiki';

// Lazy-load shiki's highlighter for code splitting
let highlighterPromise: ReturnType<typeof import('shiki').then> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then((mod) =>
      mod.createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: [],
      }),
    );
  }
  return highlighterPromise;
}

interface CodeBlockRuntimeProps {
  lang: string;
  code: string;
  onRendered?: () => void;
  shikiOptions?: {
    transformers?: ShikiTransformer[];
  };
}

export const CodeBlockRuntime = ({
  lang,
  code,
  onRendered,
  shikiOptions,
}: CodeBlockRuntimeProps) => {
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    getHighlighter().then(async (highlighter) => {
      if (cancelled) return;

      // Dynamically load the language if not already loaded
      const loadedLangs = highlighter.getLoadedLanguages();
      if (!loadedLangs.includes(lang as BundledLanguage)) {
        try {
          await highlighter.loadLanguage(lang as BundledLanguage);
        } catch {
          // Fall back to plaintext if language isn't available
        }
      }

      const loadedLangsAfter = highlighter.getLoadedLanguages();
      const effectiveLang = loadedLangsAfter.includes(lang as BundledLanguage)
        ? lang
        : 'text';

      const result = highlighter.codeToHtml(code, {
        lang: effectiveLang,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
        transformers: shikiOptions?.transformers ?? [],
      });

      if (!cancelled) {
        setHtml(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, lang, shikiOptions?.transformers]);

  // Call onRendered after HTML is set and painted
  useEffect(() => {
    if (html && onRendered) {
      requestAnimationFrame(() => onRendered());
    }
  }, [html, onRendered]);

  if (!html) {
    return (
      <pre style={{ padding: '16px', margin: 0, overflow: 'auto' }}>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rp-codeblock"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
