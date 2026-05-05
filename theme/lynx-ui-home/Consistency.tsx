// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import ConsistencyBackgroundLight from '@assets/lynx-ui-home/ConsistencyBackgroundLight.svg';
import ConsistencyDark from '@assets/lynx-ui-home/ConsistencyDark.svg';
import ConsistencySVG from '@assets/lynx-ui-home/Consistency.svg';

export const Consistency = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div className="featureBlockRow">
      <div className="flex flex-col items-center justify-center">
        <div className="featureBlockFont">
          {descriptions.consistency.title[lang]}
        </div>
        <div className="mt-4 text-center text-base text-gray-500">
          {descriptions.consistency.description[lang]}
        </div>
      </div>
      <div className="relative h-[30vw] w-[30vw] min-h-[330px] min-w-[336px]">
        <img
          alt="Consistency Background Light"
          src={ConsistencyBackgroundLight}
          className="absolute inset-0 h-full w-full"
        />
        <img
          alt="Consistency Dark"
          src={ConsistencyDark}
          className="compatibility-img-dark absolute inset-0 h-full w-full"
        />
        <img
          alt="Consistency"
          src={ConsistencySVG}
          className="compatibility-img-light absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
};
