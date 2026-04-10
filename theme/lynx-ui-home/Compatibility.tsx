// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';
import './index.scss';
import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import CompatibilityRight from '@assets/lynx-ui-home/CompatibilityRight.svg';
import CompatibilityDark from '@assets/lynx-ui-home/CompatibilityDark.svg';
import CompatibilitySVG from '@assets/lynx-ui-home/Compatibility.svg';

export const Compatibility = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div className="featureBlock">
      <div className="featureTitle">
        {descriptions.Compatibility.title[lang]}
      </div>

      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <div className="featureDescription">
          {descriptions.Compatibility.description[lang]}
        </div>
        <img
          src={CompatibilityRight}
          style={{
            transform: 'rotate(20deg)translate(10px, 5px)',
            width: '2vw',
            minWidth: '30px',
          }}
        />
      </div>

      <img
        className="compatibility-img-dark"
        src={CompatibilityDark}
        width="100%"
        style={{ borderWidth: '0px' }}
      />
      <img
        className="compatibility-img-light"
        src={CompatibilitySVG}
        width="100%"
        style={{ borderWidth: '0px' }}
      />
    </div>
  );
};
