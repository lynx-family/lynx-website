// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './index.scss';
import React, { useEffect, useState } from 'react';
import { useLang } from '@rspress/core/runtime';
import { ImageSrcList } from './Utils/demoImgs';
import ArrowSVG from '@assets/Arrow.svg';
import ArrowSVGDark from '@assets/ArrowDark.svg';
import InfiniteSlider from './SliderController';
import { useLinkNavigate } from './hooks/use-link-navigate';

export const Demos = () => {
  const imageWidth = 18; // rem
  const imageMargin = 1; // rem
  const imageHeight = 38; // rem
  const imageSrcList = ImageSrcList;
  const { linkNavigate } = useLinkNavigate();
  const lang = useLang() as 'en' | 'zh';

  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const updateSpeed = () => {
      setSpeed(window.innerWidth < 800 ? 0.5 : 1);
    };

    updateSpeed();
    window.addEventListener('resize', updateSpeed);

    return () => window.removeEventListener('resize', updateSpeed);
  }, []);
  return (
    <div className="demosWrapper">
      <InfiniteSlider speed={speed}>
        {imageSrcList.map((src: string) => {
          return (
            <img
              src={src}
              style={{
                borderRadius: '9px',
                width: `${imageWidth}rem`,
                height: `${imageHeight}rem`,
                marginLeft: `${imageMargin}rem`,
                marginRight: `${imageMargin}rem`,
              }}
              draggable={false}
            ></img>
          );
        })}
      </InfiniteSlider>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '5rem',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginRight: '1rem',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          onClick={() => linkNavigate('Components/')}
        >
          {lang === 'en' ? 'SEE ALL COMPONENTS' : '查看所有组件'}
        </div>
        <img className="compatibility-img-dark" src={ArrowSVGDark} />
        <img className="compatibility-img-light" src={ArrowSVG} />
      </div>
    </div>
    // <div className='demosWrapper'>
    //   <div
    //     className='demosList'
    //     style={{
    //       display: 'flex',
    //       flexDirection: 'row',
    //       width: `${
    //         (imageWidth + 2 * imageMargin) * imageSrcList.length * 2
    //       }rem`,
    //       height: `${imageHeight}rem`,
    //     }}
    //   >
    //     {imageSrcList.map((src: string) => {
    //       return (
    //         <img
    //           src={src}
    //           style={{
    //             borderRadius: '9px',
    //             width: `${imageWidth}rem`,
    //             height: `${imageHeight}rem`,
    //             marginLeft: `${imageMargin}rem`,
    //             marginRight: `${imageMargin}rem`,
    //           }}
    //         >
    //         </img>
    //       )
    //     })}
    //     {imageSrcList.map((src: string) => {
    //       return (
    //         <img
    //           src={src}
    //           style={{
    //             width: `${imageWidth}rem`,
    //             height: `${imageHeight}rem`,
    //             marginLeft: `${imageMargin}rem`,
    //             marginRight: `${imageMargin}rem`,
    //           }}
    //         >
    //         </img>
    //       )
    //     })}
    //     <style>
    //       {`
    //       @keyframes moveRight {
    //         0% {
    //           transform: translateX(0);
    //         }
    //         100% {
    //           transform: translateX(-${200 * imageSrcList.length}px);
    //         }
    //       }
    //     `}
    //     </style>
    //   </div>

    // </div>
  );
};
