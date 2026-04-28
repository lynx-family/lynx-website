// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useLang } from '@rspress/core/runtime';
import { Ripple } from './RippleBackground';
import { useLinkNavigate } from './hooks/use-link-navigate';
export const StartBuilding = () => {
  const { linkNavigate } = useLinkNavigate();
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className="relative bottom-0 flex h-[400px] w-full flex-col items-center justify-center overflow-hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <Ripple mainCircleSize={300} numCircles={10} />
      <div className="startBuildingTitle">
        {lang === 'zh' ? '开始使用' : 'Start building with '}
        <span className="text-[var(--home-highlight-title-color)]">
          lynx-ui
        </span>
      </div>
      <div
        className="mt-[20px] flex h-[48px] w-[142px] cursor-pointer flex-col items-center justify-center rounded-[24px] bg-[linear-gradient(275deg,var(--rp-c-brand-darker)_3%,var(--rp-c-brand)_97%)]"
        onClick={() => linkNavigate('Guides/Introduction')}
      >
        <div className="text-[var(--home-button-font-color)]">
          {lang === 'zh' ? '快速开始' : 'Get Started'}
        </div>
      </div>
    </div>
  );
};
