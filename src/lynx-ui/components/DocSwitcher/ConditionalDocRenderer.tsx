// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React, { ReactElement, useState } from 'react';
import { DocSwitcher } from './DocSwitcher';

export const ConditionalDocRenderer = (props: {
  titles: string[];
  children: ReactElement;
}) => {
  const { titles, children } = props;

  const MDXChildren = React.Children.toArray(children);
  const [selectedTitle, setSelectedTitle] = useState<string>(titles[0]);

  return (
    <div>
      {titles.length > 0 && (
        <DocSwitcher
          titles={titles}
          titleSwitched={(selectedTitle) => {
            setSelectedTitle(selectedTitle);
          }}
        />
      )}
      {MDXChildren[titles.indexOf(selectedTitle)]}
    </div>
  );
};
