// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Button } from '@lynx-js/lynx-ui';
import type { ButtonProps } from '@lynx-js/lynx-ui';
import './index.css';

export interface ActionButtonProps extends Omit<
  ButtonProps,
  'children' | 'className'
> {
  text: string;
}

export function ActionButton(props: ActionButtonProps) {
  const { text, ...rest } = props;

  return (
    <Button className="action-button" {...rest}>
      <text className="action-button-text">{text}</text>
    </Button>
  );
}
