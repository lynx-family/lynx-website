// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';

interface RsContainerProps {
  type: 'note' | 'warning' | 'danger' | 'tip' | 'info';
  title: string;
  children: React.ReactNode;
}

export default function RsContainer({
  type,
  title,
  children,
}: RsContainerProps) {
  return (
    <div className={`rspress-directive ${type}`}>
      <div className="rspress-directive-title">{title}</div>
      <div className="rspress-directive-content">{children}</div>
    </div>
  );
}
