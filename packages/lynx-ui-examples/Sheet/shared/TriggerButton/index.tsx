// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Button } from '@lynx-js/lynx-ui';
import type { ButtonProps } from '@lynx-js/lynx-ui';
import './index.css';

export interface TriggerButtonProps extends Omit<
  ButtonProps,
  'children' | 'className'
> {
  text: string;
}

export function TriggerButton(props: TriggerButtonProps) {
  const { text, ...rest } = props;

  return (
    <Button {...rest} className="trigger-button">
      <text className="trigger-button-text">{text}</text>
    </Button>
  );
}
