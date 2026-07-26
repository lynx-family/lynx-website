// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { LunaStudioShowcase } from '@site/src/luna';
import { ClearAPI } from './ClearApi';
import { ConsistencyAndPerformance } from './CombinedConsistencyAndPerformance';
import { StartBuilding } from './StartBuildingBottom';

export function LynxUIBelowHero() {
  return (
    <>
      <div className="luna-studio-showcase-home mx-auto w-full max-w-screen-2xl md:px-4 lg:px-8">
        <LunaStudioShowcase
          className="px-4 md:px-6 lg:px-8 py-8 md:py-4"
          defaultViewMode="lineup"
          responsiveMode="viewport"
        />
      </div>
      <div className="flex flex-col">
        <ClearAPI />
        <ConsistencyAndPerformance />
        <StartBuilding />
      </div>
    </>
  );
}
