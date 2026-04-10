// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

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

      <div className="flex flex-row">
        <div className="featureDescription">
          {descriptions.Compatibility.description[lang]}
        </div>
        <img
          alt="Compatibility Right"
          src={CompatibilityRight}
          className="w-[2vw] min-w-[30px] rotate-[20deg] translate-x-[10px] translate-y-[5px]"
        />
      </div>
      <img
        alt="Compatibility Dark"
        className="compatibility-img-dark w-full border-0"
        src={CompatibilityDark}
      />
      <img
        alt="Compatibility"
        className="compatibility-img-light w-full border-0"
        src={CompatibilitySVG}
      />
    </div>
  );
};
