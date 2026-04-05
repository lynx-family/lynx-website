// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { exampleConfig } from '../../../tools/configs/exampleConfig.mjs'

const defaultConfig = exampleConfig(
  {
    // For Website Examples
    SheetBasic: './Basic/index.tsx',
    SheetAutoHeight: './AutoHeight/index.tsx',
    SheetControlled: './Controlled/index.tsx',
    SheetImperative: './Imperative/index.tsx',
    // For Internal Tests
    // Uncomment entries below when running internal tests for Sheet.
    /*     SheetControlledOpen: './ControlledOpen/index.tsx',
    SheetDefaultOpen: './DefaultOpen/index.tsx',
    SheetTablet: './Tablet/index.tsx',
    SheetInternalTest: './InternalTest/index.tsx', */
  },
  false,
)

export default defaultConfig
