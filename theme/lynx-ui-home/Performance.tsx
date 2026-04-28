// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.scss';
import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import ConsistencyBackgroundLight from '@assets/lynx-ui-home/ConsistencyBackgroundLight.svg';
import PerformanceDark from '@assets/lynx-ui-home/PerformanceDark.svg';
import PerformanceLight from '@assets/lynx-ui-home/PerformanceLight.svg';
export const Performance = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div className="featureBlockRow">
      <div className="flex flex-col items-center justify-center">
        <div className="featureBlockFont">
          {descriptions.Performance.title[lang]}
        </div>
        <div className="mt-4 text-base text-gray-500">
          {descriptions.Performance.description[lang]}
        </div>
      </div>
      <div className="relative h-[30vw] w-[30vw] min-h-[330px] min-w-[336px]">
        <img
          alt="Performance Background Light"
          src={ConsistencyBackgroundLight}
          className="absolute inset-0 -z-10 h-full w-full"
        />
        <img
          alt="Performance Dark"
          src={PerformanceDark}
          className="compatibility-img-dark h-full w-full"
        />
        <img
          alt="Performance"
          src={PerformanceLight}
          className="compatibility-img-light h-full w-full"
        />
      </div>
    </div>
  );
};
