// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { defineConfig } from '@lynx-js/rspeedy'
import { pluginTailwindCSS } from 'rsbuild-plugin-tailwindcss'

import { exampleConfig } from '../../../tools/configs/exampleConfig.mjs'

const baseConfig = exampleConfig({
  DialogBasic: './Basic/index.tsx',
  DialogBasicTailwind: './BasicTailwind/index.tsx',
})

const defaultConfig = defineConfig({
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins,
    pluginTailwindCSS({ config: 'tailwind.config.ts' }),
  ],
})

export default defaultConfig
