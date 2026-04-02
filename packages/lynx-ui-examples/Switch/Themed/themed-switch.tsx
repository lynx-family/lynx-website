// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  Switch as SwitchPrimitive,
  SwitchThumb as SwitchThumbPrimitive,
  SwitchTrack as SwitchTrackPrimitive,
} from '@lynx-js/lynx-ui';
import type {
  SwitchProps,
  SwitchThumbProps,
  SwitchTrackProps,
} from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

const HitSlop = {
  'hit-slop': {
    top: '8px' as `${number}px`,
    left: '8px' as `${number}px`,
    right: '8px' as `${number}px`,
    bottom: '8px' as `${number}px`,
  },
};

type ThemedSwitchRootProps = SwitchProps;

export function ThemedSwitchRoot({
  className,
  switchProps,
  ...props
}: ThemedSwitchRootProps) {
  return (
    <SwitchPrimitive
      className={clsx(
        'flex flex-row items-center w-[48px] h-[28px] rounded-full overflow-hidden',
        'ui-disabled:opacity-50',
        className,
      )}
      switchProps={{ ...HitSlop, ...switchProps }}
      {...props}
    />
  );
}

type ThemedSwitchTrackProps = SwitchTrackProps;

export function ThemedSwitchTrack({ className }: ThemedSwitchTrackProps) {
  return (
    <SwitchTrackPrimitive
      className={clsx(
        'size-full',
        'transition-colors duration-150 ease-out',
        'bg-neutral-faint',
        'ui-checked:bg-primary',
        'ui-active:bg-primary-2',
        'ui-checked:ui-active:bg-primary-2',
        className,
      )}
    />
  );
}

type ThemedSwitchThumbProps = SwitchThumbProps;

export function ThemedSwitchThumb({ className }: ThemedSwitchThumbProps) {
  return (
    <SwitchThumbPrimitive
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
        className,
      )}
    />
  );
}

/**
 * ThemedSwitch (composed)
 * - shadcn-like: primitives are exported, and this is the default composition.
 */
export function ThemedSwitch(props: ThemedSwitchRootProps) {
  return (
    <ThemedSwitchRoot {...props}>
      <ThemedSwitchTrack />
      <ThemedSwitchThumb />
    </ThemedSwitchRoot>
  );
}
