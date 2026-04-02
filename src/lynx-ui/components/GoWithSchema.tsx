// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React, { ComponentProps } from 'react';
import { Go } from '@/components/go/Go';

enum EAppType {
  'LYNX' = 'LYNX',
  'AWEME' = 'AWEME',
  'SSLOCAL' = 'SSLOCAL',
  'POLARIS' = 'POLARIS', // UG 容器
  'HUOSHAN' = 'HUOSHAN',
  'TC21' = 'TC21',
  'LEMON8' = 'LEMON8',
  'DRAGON' = 'DRAGON', // 番茄
  'WEBCAST' = 'WEBCAST', // 直播
  'VIDEOCUT' = 'VIDEOCUT', // 剪映（国内）
  'CAPCUT' = 'CAPCUT', // 剪映（国外）
  'JULIANG' = 'JULIANG', // 巨量引擎
  'CUSTOM' = 'CUSTOM',
}

const optionsData = {
  [EAppType.LYNX]: {
    name: 'Lynx',
    type: EAppType.LYNX,
    prefix: 'lynx',
    schema: '{{{url}}}',
  },
  [EAppType.AWEME]: {
    name: '抖音',
    type: EAppType.AWEME,
    prefix: 'aweme',
    schema: 'aweme://lynxview/?surl={{{url}}}',
  },
  [EAppType.SSLOCAL]: {
    name: '头条',
    type: EAppType.SSLOCAL,
    prefix: 'sslocal',
    schema: 'sslocal://lynxview?compile_path={{{url}}}',
  },
  [EAppType.POLARIS]: {
    name: 'UG容器',
    type: EAppType.POLARIS,
    prefix: 'sslocal',
    schema: 'sslocal://polaris/lynxview?use_bullet_container=1&surl={{{url}}}',
  },
  [EAppType.WEBCAST]: {
    name: '直播',
    type: EAppType.WEBCAST,
    prefix: 'sslocal',
    schema: 'sslocal://webcast_lynxview?url={{{url}}}',
  },
  [EAppType.VIDEOCUT]: {
    name: '剪映',
    type: EAppType.VIDEOCUT,
    prefix: 'videocut',
    schema:
      'videocut://main/lynx?surl={{{url}}}&hide_loading=1&loading_bgcolor=ffffff&nav_bar_color=ffffff',
  },
  [EAppType.CAPCUT]: {
    name: 'Capcut',
    type: EAppType.CAPCUT,
    prefix: 'capcut',
    schema:
      'capcut://main/lynx?surl={{{url}}}&hide_loading=1&loading_bgcolor=ffffff&nav_bar_color=ffffff',
  },
  [EAppType.LEMON8]: {
    name: 'Lemon8',
    type: EAppType.LEMON8,
    prefix: 'sslocal',
    schema: 'sslocal://lynxview?surl={{{url}}}',
  },
  [EAppType.HUOSHAN]: {
    name: '火山',
    type: EAppType.HUOSHAN,
    prefix: 'sslocal',
    schema: 'sslocal://lynxview/?url={{{url}}}',
  },
  [EAppType.TC21]: {
    name: 'TC21',
    type: EAppType.TC21,
    prefix: 'sslocal',
    schema: 'sslocal://tc2021/lynx_page?url={{{url}}}',
  },
  [EAppType.DRAGON]: {
    name: '番茄',
    type: EAppType.DRAGON,
    prefix: 'dragon',
    schema:
      'dragon1967://lynxview?hideLoading=1&hideNavigationBar=1&url=sslocal%3A%2F%2Flynxview%2F%3Fsurl%3D{{{url}}}',
  },
  [EAppType.JULIANG]: {
    name: '巨量引擎',
    type: EAppType.JULIANG,
    prefix: 'snssdk1374',
    schema: 'snssdk1374://lynxview/?surl={{{url}}}',
  },
  [EAppType.CUSTOM]: {
    name: '自定义',
    type: EAppType.CUSTOM,
    prefix: 'custom',
    schema: 'custom://lynxview?url={{{url}}}',
  },
};

type GoProps = ComponentProps<typeof Go>;

export const GoWithSchema = (props: GoProps) => {
  return <Go {...props} schemaOptions={optionsData} />;
};
