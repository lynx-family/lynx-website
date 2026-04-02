// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';
import './index.scss';
import { WarpBackground } from './WarpBackground';
import {
  HomeLayout as BaseHomeLayout,
  Layout as BaseLayout,
} from '@rspress/core/theme-original';
import { Banner } from '@rspress/core/theme-original';
import { ClearAPI } from './ClearApi';
import { Compatibility } from './Compatibility';
import { Demos } from './Demos';
import { useNewsButton } from './useNewsButton';
import { ConsistencyAndPerformance } from './CombinedConsistencyAndPerformance';
import { StartBuilding } from './StartBuildingBottom';

const Layout = () => {
  if (process.env['LYNXUIONLY']) {
    return (
      <BaseLayout
        beforeNav={
          <Banner
            storageKey="lynx-ui-go-to-v3-1"
            href="https://lynx.bytedance.net/v3"
            message="This is for preview only. Please use Lynx official site."
          />
        }
      />
    );
  } else {
    return <BaseLayout />;
  }
};

const HomeLayout = () => {
  useNewsButton();
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
            <Demos />
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

export { HomeLayout, Layout };
