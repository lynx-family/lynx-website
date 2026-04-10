// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import { CodeBlockRuntime } from '@theme';
import './index.scss';

interface CodeComparisonProps {
  beforeCode: string;
  afterCode: string;
  language: string;
  beforeFilename: string;
  afterFilename: string;
}

export function CodeComparison({
  beforeCode,
  afterCode,
  language,
  beforeFilename,
  afterFilename,
}: CodeComparisonProps) {
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
            <div className="before-code">
              <CodeBlockRuntime lang={language} code={beforeCode} />
            </div>
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
            <div className="after-code">
              <CodeBlockRuntime lang={language} code={afterCode} />
            </div>
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
    ></CodeComparison>
  );
}
