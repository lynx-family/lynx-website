// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';
import { useLang } from '@rspress/core/runtime';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { PlatformBadge } from '@/components/api-badge';

import './style.css';

type SummaryToken = {
  kind: 'text' | 'code';
  text: string;
};

type DocTypeFallback = {
  content: Array<{ text: unknown }>;
};

function renderSummaryTokens(tokens: unknown): React.ReactNode[] {
  if (!Array.isArray(tokens)) return [];
  return tokens
    .map<React.ReactNode>((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const { kind, text } = item as SummaryToken;
      if (typeof text !== 'string') return null;
      if (kind === 'code')
        return <code key={index}>{text.replace(/`/g, '')}</code>;
      if (kind === 'text')
        return <React.Fragment key={index}>{text}</React.Fragment>;
      return null;
    })
    .filter(Boolean);
}

function normalizeType(record: Record<string, unknown>): string {
  let type = record.type;
  if (typeof type === 'object' && type && 'value' in type) {
    type = (type as { value?: unknown }).value;
  }
  const fallback = record.docTypeFallback as DocTypeFallback | null | undefined;
  if (fallback?.content?.length) {
    type = fallback.content[0]?.text;
  }
  return type != null && type !== '' ? String(type) : '';
}

const PLATFORMS: { field: string; name: PlatformName }[] = [
  { field: 'isSupportIOS', name: 'ios' },
  { field: 'isSupportAndroid', name: 'android' },
  { field: 'isSupportHarmony', name: 'harmony' },
];

function PlatformIndicators({ record }: { record: Record<string, unknown> }) {
  const supported = PLATFORMS.filter((p) => record[p.field]);
  if (supported.length === 0) return null;

  return (
    <span className="ui-api-platforms">
      {supported.map((p) => (
        <PlatformBadge key={p.name} platform={p.name} />
      ))}
    </span>
  );
}

const UIApiTable = ({ source }: { source: Record<string, unknown>[] }) => {
  if (import.meta.env.SSG_MD) return null;

  const isZh = useLang() === 'zh';

  return (
    <div className="ui-api-list">
      {source.map((item, index) => {
        const record = item as Record<string, unknown>;
        const name = String(record.name ?? '');
        const type = normalizeType(record);
        const defaultValue = record.defaultValue
          ? String(record.defaultValue)
          : '';
        const summary =
          isZh &&
          Array.isArray(record.summary_zh) &&
          record.summary_zh.length > 0
            ? record.summary_zh
            : record.summary;
        const descNodes = renderSummaryTokens(summary);
        const hasMeta = type || defaultValue;

        return (
          <div className="ui-api-item" key={name || index}>
            <div className="ui-api-item-header">
              <span className="ui-api-item-name">{name}</span>
              <PlatformIndicators record={record} />
            </div>
            {hasMeta && (
              <div className="ui-api-item-meta">
                {type && (
                  <>
                    <span className="ui-api-item-label">
                      {isZh ? '类型' : 'Type'}
                    </span>
                    <code>{type}</code>
                  </>
                )}
                {type && defaultValue && (
                  <span className="ui-api-item-dot">&middot;</span>
                )}
                {defaultValue && (
                  <>
                    <span className="ui-api-item-label">
                      {isZh ? '默认值' : 'Default'}
                    </span>
                    <code>{defaultValue}</code>
                  </>
                )}
              </div>
            )}
            {descNodes.length > 0 && (
              <div className="ui-api-item-desc">{descNodes}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface DataSourceItem {
  className: string;
  'Render Prop': string;
  item: {
    type: string;
    description_zh: string;
    description: string;
  };
}

const ClassRenderPropTable = ({ source }: { source: DataSourceItem[] }) => {
  const isZh = useLang() === 'zh';

  return (
    <div className="ui-api-list">
      {source.map((row, index) => (
        <div className="ui-api-item" key={row.className || index}>
          <span className="ui-api-item-name">{row.className}</span>
          <div className="ui-api-item-meta">
            <span className="ui-api-item-label">Render Prop</span>
            <code>{row['Render Prop']}</code>
            <span className="ui-api-item-dot">&middot;</span>
            <span className="ui-api-item-label">{isZh ? '类型' : 'Type'}</span>
            <code>{row.item.type}</code>
          </div>
          {row.item.description && (
            <div className="ui-api-item-desc">
              {isZh ? row.item.description_zh : row.item.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export { UIApiTable, ClassRenderPropTable };
