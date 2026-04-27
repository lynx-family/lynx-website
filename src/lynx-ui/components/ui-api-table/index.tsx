// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Space, Table, Typography, Popover } from '@douyinfe/semi-ui';
import { PlatformBadge } from '@/components/api-badge';
import React from 'react';

import { useLang } from '@rspress/core/runtime';

import './style.css';
const { Paragraph, Title } = Typography;

type SummaryToken = {
  kind: 'text' | 'code';
  text: string;
};

type DocTypeFallback = {
  content: Array<{ text: unknown }>;
};

type IntegratedType = {
  type?: unknown;
  desc?: unknown;
  docTypeFallback?: DocTypeFallback | null;
  zhSummary?: unknown;
};

type UIApiRecord = {
  name?: unknown;
  defaultValue?: unknown;
  isSupportIOS?: boolean;
  isSupportAndroid?: boolean;
  isSupportHarmony?: boolean;
  integratedType?: IntegratedType;
  [key: string]: unknown;
};

function renderSummaryTokens(tokens: unknown): React.ReactNode[] {
  if (!Array.isArray(tokens)) return [];

  return tokens
    .map<React.ReactNode>((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const kind = (item as SummaryToken).kind;
      const text = (item as SummaryToken).text;
      if (typeof text !== 'string') return null;

      if (kind === 'code') {
        return <code key={index}>{text.replace(/`/g, '')}</code>;
      }

      if (kind === 'text') {
        return <React.Fragment key={index}>{text}</React.Fragment>;
      }

      return null;
    })
    .filter((n): n is Exclude<React.ReactNode, null> => n !== null);
}

const UIApiTable = ({ source }: { source: Record<string, unknown>[] }) => {
  if (import.meta.env.SSG_MD) {
    // TODO: support ssg-md
    return null;
  }
  const isZh = useLang() === 'zh';

  const newSource: UIApiRecord[] = source.map((item) => {
    const record = item as UIApiRecord & {
      type?: unknown;
      summary?: unknown;
      docTypeFallback?: unknown;
      summary_zh?: unknown;
    };
    return {
      ...record,
      integratedType: {
        type: record.type,
        desc: record.summary,
        docTypeFallback:
          (record.docTypeFallback as DocTypeFallback | null | undefined) ??
          null,
        zhSummary: record.summary_zh,
      },
    };
  });

  const columns = [
    {
      title: isZh ? '名称' : 'Name',
      dataIndex: 'name',
      render: (title: React.ReactNode, record: UIApiRecord) => {
        return (
          <Space>
            <Popover
              content={
                <div>
                  {record?.isSupportIOS && <PlatformBadge platform="ios" />}
                  {record?.isSupportAndroid && (
                    <PlatformBadge platform="android" />
                  )}
                </div>
              }
            >
              <Title heading={6} ellipsis={{ showTooltip: true }}>
                {title}
              </Title>
            </Popover>
          </Space>
        );
      },
    },
    {
      title: isZh ? '默认值' : 'Default Value',
      width: 100,
      dataIndex: 'defaultValue',
      render: (defaultValue: unknown) => {
        return defaultValue ? (
          <div className="api-table-default">{String(defaultValue)}</div>
        ) : (
          '-'
        );
      },
    },
    {
      title: isZh ? '类型' : 'type',
      dataIndex: 'integratedType',
      render: (integratedType: IntegratedType) => {
        const { type, desc, docTypeFallback, zhSummary } = integratedType;

        let normalizedType = type;

        if (typeof type === 'object' && type && 'value' in type) {
          normalizedType = (type as { value?: unknown }).value;
        }

        if (docTypeFallback?.content?.length) {
          normalizedType = docTypeFallback.content[0]?.text;
        }

        const paraCollection =
          isZh && Array.isArray(zhSummary) && zhSummary.length > 0
            ? renderSummaryTokens(zhSummary)
            : renderSummaryTokens(desc);

        const renderableType = React.isValidElement(normalizedType)
          ? normalizedType
          : typeof normalizedType === 'string' ||
              typeof normalizedType === 'number'
            ? normalizedType
            : normalizedType
              ? String(normalizedType)
              : '-';
        const typeBlock = (
          <div className="api-table-type">{renderableType}</div>
        );
        const descBlock = (
          <Paragraph spacing="extended">
            {paraCollection.length > 0 ? paraCollection : '-'}
          </Paragraph>
        );

        return (
          <>
            <p className="api-table-desc-row">{typeBlock}</p>
            <p className="api-table-desc-row">{descBlock}</p>
          </>
        );
      },
    },
  ];

  return (
    <Table
      bordered={true}
      className="ui-api-table rp-not-doc"
      columns={columns}
      dataSource={newSource}
      pagination={false}
    />
  );
};

interface DataSourceItem {
  className: string;
  'Render Prop': string;
  item: {
    type: string;
    description: string;
  };
}

const ClassRenderPropTable = ({ source }: { source: DataSourceItem[] }) => {
  const isZh = useLang() === 'zh';

  const columns = [
    {
      title: 'className',
      dataIndex: 'className',
      width: 150,
      render: (className: string) => {
        return <div className="api-table-default">{className}</div>;
      },
    },
    {
      title: 'Render Prop',
      dataIndex: 'Render Prop',
      width: 150,
      render: (renderProp: string) => {
        return renderProp ? <code>{renderProp}</code> : '-';
      },
    },
    {
      title: isZh ? '描述' : 'Description',
      dataIndex: 'item',
      render: (item: DataSourceItem['item']) => {
        const { type, description } = item;

        const typeBlock = <div className="api-table-type">{type}</div>;
        const descBlock = (
          <Paragraph spacing="extended">{description}</Paragraph>
        );

        return (
          <>
            <p className="api-table-desc-row">{typeBlock}</p>
            <p className="api-table-desc-row">{descBlock}</p>
          </>
        );
      },
    },
  ];

  return (
    <Table
      bordered={true}
      className="ui-api-table rp-not-doc"
      columns={columns}
      dataSource={source}
      pagination={false}
    />
  );
};

export { UIApiTable, ClassRenderPropTable };
