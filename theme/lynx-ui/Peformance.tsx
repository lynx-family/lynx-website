// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.scss';
import React from 'react';
import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import ConsistencyBackgroundLight from '@assets/ConsistencyBackgroundLight.svg';
import PerformanceDark from '@assets/PerformanceDark.svg';
import PerformanceLight from '@assets/PerformanceLight.svg';
export const Performance = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div className="featureBlockRow">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="featureBlockFont">
          {descriptions.Performance.title[lang]}
        </div>
        <div style={{ fontSize: '1rem', marginTop: '1rem', color: 'gray' }}>
          {descriptions.Performance.description[lang]}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          width: '30vw',
          height: '30vw',
          minWidth: '336px',
          minHeight: '330px',
        }}
      >
        <img
          src={ConsistencyBackgroundLight}
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: '0',
            left: '0',
            zIndex: '-1',
          }}
        />
        <img
          className="compatibility-img-dark"
          src={PerformanceDark}
          style={{
            height: '100%',
            width: '100%',
            top: '0',
            left: '0',
          }}
        />
        <img
          className="compatibility-img-light"
          src={PerformanceLight}
          style={{
            height: '100%',
            width: '100%',
            top: '0',
            left: '0',
          }}
        />
      </div>
    </div>
  );
};
