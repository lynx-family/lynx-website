import { Children } from 'react';
import type { PropsWithChildren } from 'react';

interface Props {
  titles?: string[];
}

export function Columns({ children, titles = [] }: PropsWithChildren<Props>) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        overflow: 'hidden',
      }}
    >
      {Children.map(children, (child, index) => {
        return <Column title={titles[index]}>{child}</Column>;
      })}
    </div>
  );
}

interface ColumnProps {
  title?: string;
}

export function Column({ title, children }: PropsWithChildren<ColumnProps>) {
  return (
    <div style={{ width: '20rem', flex: 'auto', margin: 'auto' }}>
      {title && <div className="font-bold text-center">{title}</div>}
      {children}
    </div>
  );
}
