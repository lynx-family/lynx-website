// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.scss';
import { descriptions } from './featuresDescriptions';
import { Features, type FeatureCardItem } from '@/components/home-comps';
import ConsistencyDark from '@assets/lynx-ui-home/ConsistencyDark.svg';
import ConsistencyLight from '@assets/lynx-ui-home/ConsistencyLight.svg';
import PerformanceDark from '@assets/lynx-ui-home/PerformanceDark.svg';
import PerformanceLight from '@assets/lynx-ui-home/PerformanceLight.svg';

const ThemedVisual = ({
  alt,
  dark,
  light,
}: {
  alt: string;
  dark: string;
  light: string;
}) => (
  <div className="relative mt-auto h-[220px] w-full">
    <img
      alt={`${alt} Dark`}
      src={dark}
      className="compatibility-img-dark absolute inset-0 h-full w-full object-contain"
    />
    <img
      alt={alt}
      src={light}
      className="compatibility-img-light absolute inset-0 h-full w-full object-contain"
    />
  </div>
);

const CompatibilityVisual = () => (
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
);

const featureItems: FeatureCardItem[] = [
  {
    title: descriptions.consistency.title,
    desc: descriptions.consistency.description,
    customRender: (
      <ThemedVisual
        alt="Consistency"
        dark={ConsistencyDark}
        light={ConsistencyLight}
      />
    ),
  },
  {
    title: descriptions.Performance.title,
    desc: descriptions.Performance.description,
    customRender: (
      <ThemedVisual
        alt="Performance"
        dark={PerformanceDark}
        light={PerformanceLight}
      />
    ),
  },
  {
    title: descriptions.Compatibility.title,
    desc: descriptions.Compatibility.description,
    isRowSet: true,
    customRender: <CompatibilityVisual />,
  },
];

export const ConsistencyAndPerformance = () => {
  return <Features items={featureItems} />;
};
