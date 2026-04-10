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
    <div
      style={{
        bottom: 0,
        position: 'relative',
        display: 'flex',
        height: '400px',
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // borderRadius: 'var(--radius)',
        background: 'hsl(var(--background))',
        borderTopWidth: '1px',
        borderColor: 'hsl(var(--border))',
      }}
    >
      <Ripple mainCircleSize={300} numCircles={10} />
      <div className="startBuildingTitle">
        {lang === 'zh' ? '开始使用' : 'Start building with '}
        <span style={{ color: 'var(--home-highlight-title-color)' }}>
          lynx-ui
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '24px',
          width: '142px',
          height: '48px',
          marginTop: '20px',
          background:
            'linear-gradient(275deg, var(--rp-c-brand-darker) 3%, var(--rp-c-brand) 97%)',
          cursor: 'pointer',
        }}
        onClick={() => linkNavigate('Guides/Introduction')}
      >
        <div style={{ color: 'var(--home-button-font-color)' }}>
          {lang === 'zh' ? '快速开始' : 'Get Started'}
        </div>
      </div>
    </div>
  );
};
