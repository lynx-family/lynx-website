import React from 'react';
import styles from './ResponsiveDualColumn.module.css';

interface ResponsiveDualColumnProps {
  partition?: number[];
  children: React.ReactNode;
}

interface FlexItemProps {
  minWidth: number;
  children: React.ReactNode;
}

export const FlexItem = ({ minWidth, children }: FlexItemProps) => {
  return <div style={{ minWidth: `${minWidth}px`, flex: 1 }}>{children}</div>;
};

export const ResponsiveDualColumn = ({
  partition,
  children,
}: ResponsiveDualColumnProps) => {
  if (partition && React.Children.count(children) !== partition.length) {
    throw new Error(
      'Partition array length must match the number of children.',
    );
  }

  return (
    <div className={styles.container}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement<{ style?: React.CSSProperties }>(child)) {
          return child;
        }
        return React.cloneElement(child, {
          style: {
            flex: partition ? partition[index] : 1,
            ...child.props.style,
          },
        });
      })}
    </div>
  );
};
