import React from 'react';
import { cn } from '../lib/utils';
import { useI18n } from '@rspress/core/runtime';
import { Table, TableBody, TableCell, TableRow } from './ui/table';

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

  return (
    <div className={cn('not-prose', className)}>
      <Table>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="w-[120px] font-medium text-muted-foreground">
                {row.property}
              </TableCell>
              <TableCell>{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
