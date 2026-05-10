// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { Consistency } from './Consistency';
import { Performance } from './Performance';
import { Compatibility } from './Compatibility';
import featureStyles from '@/components/home-comps/features/index.module.less';

export const ConsistencyAndPerformance = () => {
  return (
    <div className={featureStyles['features-frame']}>
      <div className={featureStyles['list-frame']}>
        <Consistency />
        <Performance />
        <Compatibility />
      </div>
    </div>
  );
};
