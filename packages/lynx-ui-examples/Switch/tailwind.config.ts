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
};

export default config;
