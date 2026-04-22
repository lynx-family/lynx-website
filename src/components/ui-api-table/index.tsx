import React from 'react';
import { Space, Table, Typography, Popover } from '@douyinfe/semi-ui';
import { useLang } from '@rspress/core/runtime';
import { PlatformBadge } from '../api-badge';

const { Paragraph, Title } = Typography;

type SummaryToken = {
  kind: 'text' | 'code';
  text: string;
};

type DocTypeFallback = {
  content?: Array<{ text?: string }>;
};

type UIApiTableItem = {
  name?: string;
  type?: unknown;
  summary?: unknown;
  summary_zh?: unknown;
  docTypeFallback?: DocTypeFallback | null;
  defaultValue?: string;
  isSupportIOS?: boolean;
  isSupportAndroid?: boolean;
  isSupportHarmony?: boolean;
  [key: string]: unknown;
};

function normalizeSummary(summary: unknown): SummaryToken[] {
  if (typeof summary === 'string') {
    return summary.length > 0 ? [{ kind: 'text', text: summary }] : [];
  }

  if (!Array.isArray(summary)) {
    return [];
  }

  return summary.filter((item): item is SummaryToken => {
    return Boolean(
      item &&
        typeof item === 'object' &&
        'kind' in item &&
        'text' in item &&
        (item.kind === 'text' || item.kind === 'code') &&
        typeof item.text === 'string',
    );
  });
}

function renderSummary(summary: SummaryToken[]) {
  return summary.map((item, index) => {
    if (item.kind === 'code') {
      return <code key={index}>{item.text.replaceAll('`', '')}</code>;
    }

    return <React.Fragment key={index}>{item.text}</React.Fragment>;
  });
}

function normalizeType(
  type: unknown,
  docTypeFallback?: DocTypeFallback | null,
): React.ReactNode {
  if (docTypeFallback?.content?.length) {
    return docTypeFallback.content[0]?.text ?? '';
  }

  if (typeof type === 'string' || typeof type === 'number') {
    return type;
  }

  if (
    type &&
    typeof type === 'object' &&
    'value' in type &&
    typeof type.value === 'string'
  ) {
    return type.value;
  }

  return '';
}

const UIApiTable = ({ source }: { source: UIApiTableItem[] }) => {
  const isZh = useLang() === 'zh';

  const columns = [
    {
      title: isZh ? '名称' : 'Name',
      dataIndex: 'name',
      render: (title: string, record: UIApiTableItem) => {
        return (
          <Space>
            <Popover
              content={
                <div>
                  {record?.isSupportIOS && <PlatformBadge platform="ios" />}
                  {record?.isSupportAndroid && (
                    <PlatformBadge platform="android" />
                  )}
                  {record?.isSupportHarmony && (
                    <PlatformBadge platform="harmony" />
                  )}
                </div>
              }
            >
              <Title
                heading={6}
                ellipsis={{ showTooltip: true }}
                style={{ maxWidth: 200 }}
              >
                {title}
              </Title>
            </Popover>
          </Space>
        );
      },
    },
    {
      title: isZh ? '说明' : 'Description',
      dataIndex: 'summary',
      render: (_summary: unknown, record: UIApiTableItem) => {
        const zhSummary = normalizeSummary(record.summary_zh);
        const paraCollection = isZh
          ? zhSummary.length > 0
            ? zhSummary
            : normalizeSummary(record.summary)
          : normalizeSummary(record.summary);

        if (paraCollection.length === 0) {
          return '-';
        }

        return <Paragraph>{renderSummary(paraCollection)}</Paragraph>;
      },
    },
    {
      title: isZh ? '类型' : 'Type',
      dataIndex: 'type',
      render: (type: unknown, record: UIApiTableItem) => {
        const normalizedType = normalizeType(type, record.docTypeFallback);
        return normalizedType ? <code>{normalizedType}</code> : '-';
      },
    },
    {
      title: isZh ? '默认值' : 'Default Value',
      width: 100,
      dataIndex: 'defaultValue',
      render: (defaultValue: string) => {
        return defaultValue && defaultValue !== 'undefined' ? (
          <code>{defaultValue}</code>
        ) : (
          '-'
        );
      },
    },
  ];

  return <Table columns={columns} dataSource={source} pagination={false} />;
};

export { UIApiTable };
