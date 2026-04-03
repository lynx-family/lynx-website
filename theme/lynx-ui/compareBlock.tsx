// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import React from 'react';
import { descriptions } from './featuresDescriptions';
import { useLang, useDark } from '@rspress/core/runtime';
import './index.scss';

interface CodeComparisonProps {
  beforeCode: string;
  afterCode: string;
  language: string;
  beforeFilename: string;
  afterFilename: string;
  lightTheme: string;
  darkTheme: string;
}

export function CodeComparison({
  beforeCode,
  afterCode,
  language,
  beforeFilename,
  afterFilename,
  lightTheme,
  darkTheme,
}: CodeComparisonProps) {
  const { theme, systemTheme } = useTheme();
  const [highlightedBefore, setHighlightedBefore] = useState('');
  const [highlightedAfter, setHighlightedAfter] = useState('');

  useEffect(() => {
    const currentTheme = theme === 'system' ? systemTheme : theme;
    const selectedTheme = currentTheme === 'dark' ? darkTheme : lightTheme;

    async function highlightCode() {
      try {
        const { codeToHtml } = await import('shiki');
        const before = await codeToHtml(beforeCode, {
          lang: language,
          theme: selectedTheme,
        });
        const after = await codeToHtml(afterCode, {
          lang: language,
          theme: selectedTheme,
        });
        setHighlightedBefore(before);
        setHighlightedAfter(after);
      } catch (error) {
        console.error('Error highlighting code:', error);
        setHighlightedBefore(`<pre>${beforeCode}</pre>`);
        setHighlightedAfter(`<pre>${afterCode}</pre>`);
      }
    }
    highlightCode();
  }, [
    theme,
    systemTheme,
    beforeCode,
    afterCode,
    language,
    lightTheme,
    darkTheme,
  ]);

  const renderCode = (code: string, highlighted: string) => {
    if (highlighted) {
      return (
        <div
          className="before-code"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      );
    } else {
      return <pre className="after-code">{code}</pre>;
    }
  };
  return (
    <div className="ui-home-code-frame">
      <div
        className="content-frame"
        style={{
          borderRadius: '18px',
          boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="code-area-frame">
          <div>
            <div
              className="before-title"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                borderBottomColor: 'var(--home-section-divider)',
                borderBottomWidth: '1px',
              }}
            >
              {beforeFilename}
            </div>
            {renderCode(beforeCode, highlightedBefore)}
          </div>
          <div>
            <div
              className="after-title"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                borderBottomColor: 'var(--home-section-divider)',
                borderBottomWidth: '1px',
              }}
            >
              {afterFilename}
            </div>
            {renderCode(afterCode, highlightedAfter)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CodeComparisonBlock() {
  const lang = useLang() as 'en' | 'zh';
  return (
    <CodeComparison
      beforeCode={descriptions.ClearAPI.details.beforeCode}
      afterCode={descriptions.ClearAPI.details.afterCode}
      language="typescript"
      beforeFilename={descriptions.ClearAPI.details.beforeFileName[lang]}
      afterFilename={descriptions.ClearAPI.details.afterFileName[lang]}
      lightTheme={useDark() ? 'everforest-dark' : 'everforest-light'}
      darkTheme="github-dark"
    ></CodeComparison>
  );
}
