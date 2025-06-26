import React from 'react';
import { Table } from '@douyinfe/semi-ui';
import { cn } from '../lib/utils';
import { useDark, useI18n } from '@rspress/core/runtime';

interface PropertyDefinitionProps {
  initialValue: React.ReactNode;
  appliesTo: React.ReactNode;
  inherited: 'yes' | 'no';
  animatable: 'yes' | 'no';
  percentages?: React.ReactNode;
  className?: string;
}

export const PropertyDefinition: React.FC<PropertyDefinitionProps> = ({
  initialValue,
  appliesTo,
  inherited,
  animatable,
  percentages,
  className,
}) => {
  const text = useI18n();
  const dark = useDark();

  const data = [
    {
      key: 'initial-value',
      property: text('css-api.property.initial_value'),
      value: initialValue,
    },
    {
      key: 'applies-to',
      property: text('css-api.property.applies_to'),
      value: appliesTo,
    },
    {
      key: 'inherited',
      property: text('css-api.property.inherited'),
      value: inherited,
    },
    {
      key: 'animatable',
      property: text('css-api.property.animatable'),
      value: animatable,
    },
  ];

  if (percentages) {
    data.push({
      key: 'percentages',
      property: text('css-api.property.percentages'),
      value: percentages,
    });
  }

  const columns = [
    {
      title: '',
      dataIndex: 'property',
      width: 120,
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: '',
      dataIndex: 'value',
      render: (value: React.ReactNode) => <span>{value}</span>,
    },
  ];

  return (
    <div className={cn('not-prose', className)}>
      <Table
        size="small"
        pagination={false}
        showHeader={false}
        bordered
        columns={columns}
        dataSource={data}
        className={`${dark ? 'semi-always-dark' : 'semi-always-light'}`}
      />
    </div>
  );
};
