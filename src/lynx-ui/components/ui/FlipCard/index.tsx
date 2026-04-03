// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React, { ReactNode, useState } from 'react';
import './index.scss';

export const FlipCard = (props: { front?: ReactNode; back?: ReactNode }) => {
  const { front, back } = props;

  return (
    <div className="flip-card">
      <div className="flip-card-inner">
        <div className="flip-card-front">{front}</div>
        <div className="flip-card-back">{back}</div>
      </div>
    </div>
  );
};

export const HoverOverlayWithText = (props: {
  front: ReactNode;
  title: string;
  content: string[];
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { front, title, content } = props;

  return (
    <div
      className="flip-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {front}
      <div className={`overlay ${isHovered ? 'visible' : ''}`}>
        <div className="overlay-content">
          <div
            className="my-4 leading-9"
            style={{ display: 'flex', justifyContent: 'start' }}
          >
            <code style={{ color: 'var(--component-card-font-color)' }}>
              {title}
            </code>
          </div>
          {content.map((description) => {
            return (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--component-card-font-color)',
                  textAlign: 'left',
                }}
              >
                {description}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HoverOverlayWithText;
