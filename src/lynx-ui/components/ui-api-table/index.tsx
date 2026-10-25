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

export type UIApiTableItem = Record<string, unknown>;

export interface UIApiTableProps {
  source: UIApiTableItem[];
  title?: string;
}

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

const UIApiTable = ({ source, title }: UIApiTableProps) => {
  if (import.meta.env.SSG_MD) return null;

  const isZh = useLang() === 'zh';
  const titleId = React.useId();

  const table = (
    <div
      className="ui-api-list"
      role={title ? 'table' : undefined}
      aria-labelledby={title ? titleId : undefined}
    >
      {source.map((item, index) => {
        const record = item as UIApiTableItem;
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

        const content = (
          <>
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
          </>
        );

        return (
          <div
            className="ui-api-item"
            key={name || index}
            role={title ? 'row' : undefined}
          >
            {title ? <div role="cell">{content}</div> : content}
          </div>
        );
      })}
    </div>
  );

  if (!title) return table;

  return (
    <div className="ui-api-table">
      <div className="ui-api-table-title" id={titleId}>
        {title}
      </div>
      {table}
    </div>
  );
};

export interface StateExposureRow {
  className?: string;
  renderProp?: string;
  item: {
    type: string;
    description?: string;
    description_zh?: string;
  };
}

type LegacyStateExposureRow = StateExposureRow & {
  'Render Prop'?: string;
};

export interface ClassRenderPropTableProps {
  source: Array<StateExposureRow | LegacyStateExposureRow>;
}

function getRenderProp(
  row: StateExposureRow | LegacyStateExposureRow,
): string | undefined {
  return row.renderProp ?? (row as LegacyStateExposureRow)['Render Prop'];
}

const ClassRenderPropTable = ({ source }: ClassRenderPropTableProps) => {
  const isZh = useLang() === 'zh';
  const showClassName = source.some((row) => Boolean(row.className));
  const showRenderProp = source.some((row) => Boolean(getRenderProp(row)));
  const isVariantOnly = showClassName && !showRenderProp;
  const showType = showRenderProp;
  const classNameLabel = isZh ? '类名' : 'Class Name';
  const renderPropLabel = isZh ? '渲染属性' : 'Render Prop';
  const typeLabel = isZh ? '类型' : 'Type';
  const descriptionLabel = isZh ? '说明' : 'Description';

  return (
    <div
      className={`ui-api-list${isVariantOnly ? ' ui-api-state-list--variant-only' : ''}`}
    >
      <table className="ui-api-state-table">
        <thead
          className={`ui-api-state-header${isVariantOnly ? ' ui-api-state-header--visually-hidden' : ''}`}
        >
          <tr>
            {showClassName && <th scope="col">{classNameLabel}</th>}
            {showRenderProp && <th scope="col">{renderPropLabel}</th>}
            {showType && <th scope="col">{typeLabel}</th>}
            <th scope="col">{descriptionLabel}</th>
          </tr>
        </thead>
        <tbody>
          {source.map((row, index) => {
            const renderProp = getRenderProp(row);
            const description = isZh
              ? (row.item.description_zh ?? row.item.description)
              : (row.item.description ?? row.item.description_zh);
            const placeholderLabel = isZh ? '未提供' : 'Not provided';

            return (
              <tr
                className="ui-api-item"
                key={row.className || renderProp || index}
              >
                {showClassName && (
                  <td className="ui-api-state-cell ui-api-state-class-name-cell">
                    <span
                      aria-hidden="true"
                      className="ui-api-state-mobile-label"
                    >
                      {classNameLabel}
                    </span>
                    {row.className ? (
                      <span className="ui-api-item-name ui-api-state-class-name">
                        {row.className}
                      </span>
                    ) : (
                      <span
                        aria-label={placeholderLabel}
                        className="ui-api-state-placeholder"
                      >
                        &mdash;
                      </span>
                    )}
                  </td>
                )}
                {showRenderProp && (
                  <td className="ui-api-state-cell ui-api-state-render-prop">
                    <span
                      aria-hidden="true"
                      className="ui-api-state-mobile-label"
                    >
                      {renderPropLabel}
                    </span>
                    {renderProp ? (
                      <code className="ui-api-state-value">{renderProp}</code>
                    ) : (
                      <span
                        aria-label={placeholderLabel}
                        className="ui-api-state-placeholder"
                      >
                        &mdash;
                      </span>
                    )}
                  </td>
                )}
                {showType && (
                  <td className="ui-api-state-cell ui-api-state-type">
                    <span
                      aria-hidden="true"
                      className="ui-api-state-mobile-label"
                    >
                      {typeLabel}
                    </span>
                    <code className="ui-api-state-value">{row.item.type}</code>
                  </td>
                )}
                <td className="ui-api-state-cell ui-api-state-description">
                  <span
                    aria-hidden="true"
                    className="ui-api-state-mobile-label"
                  >
                    {descriptionLabel}
                  </span>
                  {description && <span>{description}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export { UIApiTable, ClassRenderPropTable };
