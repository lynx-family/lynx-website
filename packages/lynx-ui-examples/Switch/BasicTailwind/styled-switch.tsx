// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Switch, SwitchThumb, SwitchTrack } from '@lynx-js/lynx-ui';
import type { SwitchProps } from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

const HitSlop = {
  'hit-slop': {
    top: '8px' as `${number}px`,
    left: '8px' as `${number}px`,
    right: '8px' as `${number}px`,
    bottom: '8px' as `${number}px`,
  },
};

export function StyledSwitch({
  checked,
  defaultChecked,
  disabled,
  onChange,
  className,
  style,
  switchProps,
}: SwitchProps) {
  return (
    <Switch
      className={clsx(
        'flex flex-row items-center w-[48px] h-[28px] rounded-full overflow-hidden',
        'ui-disabled:opacity-50',
        className,
      )}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onChange={onChange}
      style={style}
      switchProps={{ ...HitSlop, ...switchProps }}
    >
      {/* Track */}
      <SwitchTrack
        className={clsx(
          'size-full',
          'transition-colors duration-150 ease-out',
          'bg-neutral-faint',
          'ui-checked:bg-primary',
          'ui-active:bg-primary-2',
          'ui-checked:ui-active:bg-primary-2',
        )}
      />

      {/* Thumb */}
      <SwitchThumb
        className={clsx(
          // positioned relative to Switch root
          'absolute size-[22px] rounded-full bg-primary-content shadow',
          'transition-all duration-150 ease-out',
          // base position
          'transform-[translateX(3px)]',
          // checked position
          'ui-checked:transform-[translateX(23px)]',
          // Jelly press
          'ui-active:w-[33px]',
          // checked position offset for jelly effect
          'ui-checked:ui-active:transform-[translateX(12px)]',
        )}
      />
    </Switch>
  );
}
