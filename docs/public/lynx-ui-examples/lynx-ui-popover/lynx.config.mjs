// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { defineConfig } from '@lynx-js/rspeedy'
import { pluginTailwindCSS } from 'rsbuild-plugin-tailwindcss'

import { exampleConfig } from '../../../tools/configs/exampleConfig.mjs'

const baseConfig = exampleConfig({
  PopoverBasic: './Basic/index.tsx',
  PopoverBasicTailwind: './BasicTailwind/index.tsx',
  PopoverOffsetAdjustment: './OffsetAdjustment/index.tsx',
  PopoverExtraAnchor: './ExtraAnchor/index.tsx',
  PopoverWithScrollView: './WithScrollView/index.tsx',
  PopoverBackdrop: './Backdrop/index.tsx',
  PopoverControlled: './Controlled/index.tsx',
  PopoverCustomArrow: './CustomArrow/index.tsx',
  // Uncomment entries below when running internal tests for Popover.
  /* PopoverInternalTestFastToggle: './InternalTest/FastToggle/index.tsx',
  PopoverInternalTestAnimationCancel:
    './InternalTest/AnimationCancel/index.tsx',
  PopoverInternalTestWithScrollView: './InternalTest/WithScrollView/index.tsx',
  PopoverInternalTestBackdrop: './InternalTest/Backdrop/index.tsx', */
})

const defaultConfig = defineConfig({
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins,
    pluginTailwindCSS({ config: 'tailwind.config.ts' }),
  ],
})

export default defaultConfig
