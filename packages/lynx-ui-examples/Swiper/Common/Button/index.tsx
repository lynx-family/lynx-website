// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Button as ButtonPrimitives } from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

import './styles.css';

export function Button({
  type,
  text,
  subText,
  onClick,
  className,
}: {
  className?: string;
  type?: 'primary' | 'secondary' | 'tertiary';
  text?: string;
  subText?: string;
  onClick?: () => void;
}) {
  return (
    <ButtonPrimitives
      onClick={onClick}
      className={clsx('button', className, type)}
    >
      {({ active = false }) => (
        <view className={clsx('button-inner', { 'button--active': active })}>
          <text className={clsx('text', { 'text--active': active })}>
            {text}
          </text>
          {subText && (
            <text className={clsx('sub-text', { 'subText--active': active })}>
              {subText}
            </text>
          )}
        </view>
      )}
    </ButtonPrimitives>
  );
}
