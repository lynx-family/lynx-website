// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.scss';
import { descriptions } from './featuresDescriptions';
import { useLang } from '@rspress/core/runtime';
import featureStyles from '@/components/home-comps/features/index.module.less';
import cls from 'classnames';

export const Compatibility = () => {
  const lang = useLang() as 'en' | 'zh';
  return (
    <div
      className={cls(
        featureStyles['list-item'],
        featureStyles['row-set'],
        'ui-home-compat-card',
      )}
    >
      <div className="ui-home-compat-content">
        <div className={featureStyles['title']}>
          {descriptions.Compatibility.title[lang]}
        </div>
        <div className={featureStyles['desc']}>
          {descriptions.Compatibility.description[lang]}
        </div>
      </div>
      <div className="ui-home-compat-visual" aria-hidden="true">
        <div className="ui-home-compat-rows">
          <div className="ui-home-compat-row">
            <div className="ui-home-compat-row-pills">
              <div className="ui-home-compat-pill ui-home-compat-pill--muted">
                Lynx 3.2
              </div>
              <div className="ui-home-compat-pill ui-home-compat-pill--muted">
                Lynx 3.7
              </div>
            </div>
          </div>

          <div className="ui-home-compat-row">
            <div className="ui-home-compat-column-pills">
              <div className="ui-home-compat-pill ui-home-compat-pill--muted">
                @lynx-js/react@0.105
              </div>
              <div className="ui-home-compat-pill ui-home-compat-pill--muted">
                @lynx-js/react@0.120
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
