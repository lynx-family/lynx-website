// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { HoverOverlayWithText } from '../ui/FlipCard';
import './index.scss';
import React from 'react';
import type { showCaseData } from './showCaseData';

export const CaseSection = (props: {
  caseData: showCaseData[];
  locale: 'zh' | 'en';
}) => {
  const { caseData, locale } = props;
  return (
    <div className="section">
      {caseData.map((data: showCaseData, index: number) => (
        <div className="item" key={data.title + index}>
          {/* <FlipCard
            front={
              <img
                src={data.img}
                style={{ height: '100%', objectFit: 'contain', margin: 'auto' }}
              />
            }
            back={
              <div
                style={{
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyItems: 'start',
                }}
              >
                <div className='my-4 leading-9'>
                  <code style={{ color: 'black' }}>{data.title}</code>
                </div>
                {locale === 'zh'
                  && data.caseDescriptionZH.map((description: string) => (
                    <div style={{ fontSize: '13px', color: 'black' }}>
                      {description}
                    </div>
                  ))}
                {locale === 'en'
                  && data.caseDescription.map((description: string) => (
                    <div style={{ fontSize: '13px', color: 'black' }}>
                      {description}
                    </div>
                  ))}
              </div>
            }
          /> */}
          <HoverOverlayWithText
            front={
              <img
                src={data.img}
                style={{ height: '100%', objectFit: 'contain', margin: 'auto' }}
              />
            }
            title={data.title}
            content={
              locale === 'zh' ? data.caseDescriptionZH : data.caseDescription
            }
          />
        </div>
      ))}
    </div>
  );
};
