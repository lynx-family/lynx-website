// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.scss';
import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import PerformanceDark from '@assets/lynx-ui-home/PerformanceDark.svg';
import PerformanceLight from '@assets/lynx-ui-home/PerformanceLight.svg';
import featureStyles from '@/components/home-comps/features/index.module.less';
export const Performance = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div className={featureStyles['list-item']}>
      <div className={featureStyles['title']}>
        {descriptions.Performance.title[lang]}
      </div>
      <div className={featureStyles['desc']}>
        {descriptions.Performance.description[lang]}
      </div>
      <div className="relative mt-auto h-[220px] w-full">
        <img
          alt="Performance Dark"
          src={PerformanceDark}
          className="compatibility-img-dark absolute inset-0 h-full w-full object-contain"
        />
        <img
          alt="Performance"
          src={PerformanceLight}
          className="compatibility-img-light absolute inset-0 h-full w-full object-contain"
        />
      </div>
    </div>
  );
};
