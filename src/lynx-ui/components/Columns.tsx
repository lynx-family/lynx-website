// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Children } from 'react';
import type { PropsWithChildren } from 'react';

interface Props {
  titles: string[];
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
      {title && (
        <div style={{ fontWeight: 'bold', textAlign: 'center' }}>{title}</div>
      )}
      {children}
    </div>
  );
}
