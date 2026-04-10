// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';
import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import ConsistencyBackgroundLight from '@assets/lynx-ui-home/ConsistencyBackgroundLight.svg';
import ConsistencyDark from '@assets/lynx-ui-home/ConsistencyDark.svg';
import ConsistencySVG from '@assets/lynx-ui-home/Consistency.svg';
export const Consistency = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div className="featureBlockRow">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'spaceBetween',
        }}
      >
        <div className="featureBlockFont">
          {descriptions.consistency.title[lang]}
        </div>
        <div
          style={{
            fontSize: '1rem',
            marginTop: '1rem',
            color: 'gray',
            textAlign: 'center',
          }}
        >
          {descriptions.consistency.description[lang]}
        </div>
      </div>
      <div
        style={{
          width: '30vw',
          height: '30vw',
          position: 'relative',
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
          }}
        />
        <img
          className="compatibility-img-dark"
          src={ConsistencyDark}
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: '0',
            left: '0',
          }}
        />
        <img
          className="compatibility-img-light"
          src={ConsistencySVG}
          style={{
            position: 'absolute',
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
