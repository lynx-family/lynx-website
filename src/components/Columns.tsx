import { Children } from 'react';
import type { PropsWithChildren } from 'react';

type ColumnsProps = PropsWithChildren<{
  titles?: string[];
}>;

function Columns({ children, titles = [] }: ColumnsProps) {
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

function Column({ title, children }: PropsWithChildren<ColumnProps>) {
  return (
    <div style={{ width: '20rem', flex: 'auto', margin: 'auto' }}>
      {title && <div className="font-bold text-center">{title}</div>}
      {children}
    </div>
  );
}

export { Columns, Column };
export type { ColumnsProps };
