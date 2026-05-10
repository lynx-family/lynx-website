// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { descriptions } from './featuresDescriptions';
import { CodeComparisonBlock } from './compareBlock';
import './index.scss';
import { useLang } from '@rspress/core/runtime';
import TwoHalfCircleLight from '@assets/lynx-ui-home/TwoHalfCircleLight.svg';
import RectangleLight from '@assets/lynx-ui-home/RectangleLight.svg';

export const ClearAPI = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className="featureBlock">
      <div className="flex flex-row items-center justify-center">
        <img
          alt="Clear API Circle"
          src={TwoHalfCircleLight}
          className="h-6 w-6 -rotate-[145deg] -translate-x-4 -translate-y-4"
        />
        <div className="featureTitle">{descriptions.ClearAPI.title[lang]}</div>
        <img
          alt="Clear API Rectangle"
          src={RectangleLight}
          className="h-6 w-6 translate-x-4 translate-y-4 -rotate-[25deg]"
        />
      </div>
      <div className="featureDescription">
        {descriptions.ClearAPI.description[lang]}
      </div>
      <div className="relative flex flex-col items-center">
        <div className="ui-home-vs-badge translate-y-1/2" aria-hidden="true">
          VS
        </div>
        <CodeComparisonBlock />
      </div>
    </div>
  );
};

export default ClearAPI;
