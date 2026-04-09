// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';
import './index.scss';
import { WarpBackground } from './WarpBackground';
import { HomeLayout as BaseHomeLayout } from '@rspress/core/theme-original';
import { ClearAPI } from './ClearApi';
import { Compatibility } from './Compatibility';
import { ConsistencyAndPerformance } from './CombinedConsistencyAndPerformance';
import { StartBuilding } from './StartBuildingBottom';

export const HomeLayout = () => {
  return (
    <>
      <WarpBackground
        className="lynx-ui-home-warp"
        beamSize={0.5}
        beamsPerSide={5}
        perspective={500}
        gridSize={3}
        gridLineWidth={0.5}
      >
        <div className="home-layout-container" style={{ position: 'relative' }}>
          <BaseHomeLayout />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <ClearAPI />
            <ConsistencyAndPerformance />
            <Compatibility />
            <StartBuilding />
          </div>
        </div>
      </WarpBackground>
    </>
  );
};
