// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.scss';
import { WarpBackground } from './WarpBackground';
import {
  HomeLayout as BaseHomeLayout,
  getCustomMDXComponent as basicGetCustomMDXComponent,
} from '@rspress/core/theme-original';
import { useRef } from 'react';
import { ClearAPI } from './ClearApi';
import { ConsistencyAndPerformance } from './CombinedConsistencyAndPerformance';
import { StartBuilding } from './StartBuildingBottom';
import { LunaStudioShowcase } from '@site/src/luna';

export const HomeLayout = () => {
  const { pre: PreWithCodeButtonGroup, code: Code } =
    basicGetCustomMDXComponent();
  const copyElementRef = useRef<HTMLElement | null>(null);
  const CodeWithRef = Code as unknown as React.ComponentType<
    React.ComponentProps<typeof Code> & { ref?: React.Ref<HTMLElement> }
  >;

  const afterHeroActions = (
    <div
      className="rp-doc home-hero-codeblock"
      style={{ minHeight: 'auto', width: '100%', maxWidth: 300 }}
    >
      <PreWithCodeButtonGroup
        containerElementClassName="language-bash"
        codeButtonGroupProps={{
          copyElementRef:
            copyElementRef as unknown as React.RefObject<HTMLDivElement | null>,
          showCodeWrapButton: false,
        }}
      >
        <CodeWithRef
          ref={copyElementRef}
          className="language-bash"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
          }}
        >
          npm i @lynx-js/lynx-ui
        </CodeWithRef>
      </PreWithCodeButtonGroup>
    </div>
  );

  return (
    <div className="lynx-ui-home-warp">
      <WarpBackground
        className="beam-background"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '70vh',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        beamSize={0.5}
        beamsPerSide={7}
        perspective={500}
        gridSize={3}
        gridLineWidth={0.5}
      />
      <div className="home-layout-container relative z-10">
        <BaseHomeLayout afterHeroActions={afterHeroActions} />
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
      </div>
    </div>
  );
};
