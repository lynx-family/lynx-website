// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';
import { useState } from 'react';
import './index.scss';

export const DocSwitcher = (props: {
  titles: string[];
  titleSwitched: (selectedTitle: string) => void;
}) => {
  const { titles, titleSwitched } = props;

  if (titles.length < 1) {
    return;
  }
  const [selectedTitle, setSelectedTitle] = useState<string>(titles[0]);
  const handleClick = (title: string) => {
    setSelectedTitle(title);
    titleSwitched(title);
  };
  return (
    <div className="tab">
      {titles.map((title: string) => {
        return (
          <div
            style={{
              paddingTop: '8px',
              paddingBottom: '12px',
              paddingLeft: '16px',
              paddingRight: '16px',
              borderColor: 'var(--foreground)',
              borderBottomWidth: selectedTitle === title ? '2px' : '0px',
              color: selectedTitle === title ? 'var(--foreground)' : 'gray',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
            onClick={() => handleClick(title)}
          >
            {title}
          </div>
        );
      })}
    </div>
  );
};
