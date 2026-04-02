// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import GoIcon from './GoIcon';
import React from 'react';
import { Button } from '@douyinfe/semi-ui';

export const GoRightFooter = (props: { demoName: string; version: string }) => {
  const { demoName, version = '0.0.4' } = props;
  if (import.meta.env.SSG_MD) {
    return null;
  }
  return (
    <Button
      theme="borderless"
      icon={<GoIcon style={{ color: 'var(--semi-color-text-2)' }} />}
      type="tertiary"
      size="small"
      onClick={() => {
        window.open(
          `https://crossplatform-playground-boe.bytedance.net/preview?zip=https://tosv.byted.org/obj/cross-platform-playground/lynx-ui-doc/examplesPackagesTry/lynx-ui-${demoName}-${version}.tgz`,
          '_blank',
        );
      }}
    />
  );
};
