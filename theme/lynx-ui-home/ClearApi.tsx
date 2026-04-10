// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';
import { descriptions } from './featuresDescriptions';
import { CodeComparisonBlock } from './compareBlock';
import './index.scss';
import { useLang } from '@rspress/core/runtime';
import TwoHalfCircleLight from '@assets/lynx-ui-home/TwoHalfCircleLight.svg';
import RectangleLight from '@assets/lynx-ui-home/RectangleLight.svg';
import VSIconLight from '@assets/lynx-ui-home/VSIconLight.svg';
import VSIconDark from '@assets/lynx-ui-home/VSIconDark.svg';

export const ClearAPI = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className="featureBlock">
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src={TwoHalfCircleLight}
          style={{
            width: '1.5rem',
            height: '1.5rem',
            transform: 'rotateZ(-145deg) translateX(20px) translateY(8px)',
          }}
        />
        <div className="featureTitle">{descriptions.ClearAPI.title[lang]}</div>
        <img
          src={RectangleLight}
          style={{
            width: '1.5rem',
            height: '1.5rem',
            transform: 'translateY(1rem) translateX(1rem) rotate(-25deg)',
          }}
        />
      </div>
      <div className="featureDescription">
        {descriptions.ClearAPI.description[lang]}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <img
          className="compatibility-img-light"
          src={VSIconLight}
          width="45vw"
          style={{
            position: 'relative',
            transform: 'translateY(50%)',
            zIndex: '100',
          }}
        />
        <img
          className="compatibility-img-dark"
          src={VSIconDark}
          width="45vw"
          style={{
            position: 'relative',
            transform: 'translateY(50%)',
            zIndex: '100',
          }}
        />
        <CodeComparisonBlock />
      </div>
    </div>
  );
};

export default ClearAPI;
