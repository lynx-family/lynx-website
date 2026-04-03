// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { LunaPreset } from '@lynx-js/luna-tailwind';
import LynxPreset from '@lynx-js/tailwind-preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  // 'content' config will be replaced by pluginTailwindCSS,
  // retains here for correct typing
  content: [],
  presets: [LynxPreset, LunaPreset],
  theme: {
    extend: {
      keyframes: {
        'popover-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.85)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        'popover-out': {
          '0%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
        },
      },
      animation: {
        'popover-in':
          'popover-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'popover-out': 'popover-out 120ms cubic-bezier(0.4, 0, 1, 1) forwards',
      },
    },
  },
};

export default config;
