import React from 'react';
import './ResponsiveDualColumn.css'; // 假设样式定义在这个CSS文件中

interface ResponsiveDualColumnProps {
  partition?: number[];
  children: React.ReactNode;
}

interface FlexItemProps {
  minWidth: number;
  children: React.ReactNode;
}

export const FlexItem: React.FC<FlexItemProps> = ({ minWidth, children }) => {
  return <div style={{ minWidth: `${minWidth}px`, flex: 1 }}>{children}</div>;
};

export const ResponsiveDualColumn: React.FC<ResponsiveDualColumnProps> = ({
  partition,
  children,
}) => {
  if (partition && React.Children.count(children) !== partition.length) {
    throw new Error(
      'Partition array length must match the number of children.',
    );
  }

  return (
    <div className="flex-container">
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child as React.ReactElement, {
          style: {
            flex: partition ? partition[index] : 1,
            ...(child as React.ReactElement).props.style,
          },
        }),
      )}
    </div>
  );
};
