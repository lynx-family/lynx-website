// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Space, Table, Typography, Popover } from '@douyinfe/semi-ui';
import { PlatformBadge } from '../api-badge';
import React from 'react';

import { useLang } from '@rspress/core/runtime';

import './style.css';
const { Paragraph, Title } = Typography;

const UIApiTable = ({ source }: { source: Record<string, unknown>[] }) => {
  if (import.meta.env.SSG_MD) {
    // TODO: support ssg-md
    return null;
  }
  const isZh = useLang() === 'zh';

  const newSource = source.map((item) => {
    return {
      ...item,
      integratedType: {
        type: item.type,
        desc: item.summary,
        docTypeFallback: item.docTypeFallback,
        zhSummary: item['summary_zh'],
      },
    };
  });

  const columns = [
    {
      title: isZh ? '名称' : 'Name',
      dataIndex: 'name',
      render: (title, record) => {
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
      render: (defaultValue) => {
        return defaultValue ? (
          <div className="api-table-default">{defaultValue}</div>
        ) : (
          '-'
        );
      },
    },
    {
      title: isZh ? '类型' : 'type',
      dataIndex: 'integratedType',
      render: (integratedType) => {
        const { type, desc, docTypeFallback, zhSummary } = integratedType;

        let normalizedType = type;

        if (typeof type === 'object') {
          normalizedType = type.value;
        }

        if (docTypeFallback && docTypeFallback.content.length > 0) {
          normalizedType = docTypeFallback.content[0].text;
        }

        const paraCollection =
          isZh && zhSummary && zhSummary.length > 0
            ? zhSummary
            : desc?.map((item) => {
                if (item.kind === 'text') {
                  return item.text;
                } else if (item.kind === 'code') {
                  const text = item.text.replaceAll('`', '');
                  return <code>{text}</code>;
                }
              });
        const typeBlock = (
          <div className="api-table-type">{normalizedType}</div>
        );
        const descBlock = (
          <Paragraph spacing="extended">{paraCollection}</Paragraph>
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
