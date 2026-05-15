// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import ConsistencyDark from '@assets/lynx-ui-home/ConsistencyDark.svg';
import ConsistencyLight from '@assets/lynx-ui-home/ConsistencyLight.svg';
import featureStyles from '@/components/home-comps/features/index.module.less';

export const Consistency = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div className={featureStyles['list-item']}>
      <div className={featureStyles['title']}>
        {descriptions.consistency.title[lang]}
      </div>
      <div className={featureStyles['desc']}>
        {descriptions.consistency.description[lang]}
      </div>
      <div className="relative mt-auto h-[220px] w-full">
        <img
          alt="Consistency Dark"
          src={ConsistencyDark}
          className="compatibility-img-dark absolute inset-0 h-full w-full object-contain"
        />
        <img
          alt="Consistency Light"
          src={ConsistencyLight}
          className="compatibility-img-light absolute inset-0 h-full w-full object-contain"
        />
      </div>
    </div>
  );
};
