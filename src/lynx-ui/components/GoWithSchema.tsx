// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import path from 'path';
import React, { ComponentProps } from 'react';
import { Go as GoBase, GoConfigProvider } from '@lynx-js/go-web';
import type { GoProps } from '@lynx-js/go-web';
import { rspressAdapter } from '@lynx-js/go-web/adapters/rspress';
import Callout from '@/components/Callout';
import { ExamplePreview as SSGComponent } from '@/components/go/example-preview-ssg';

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

const ErrorComponent = ({
  example,
  exampleBaseUrl,
}: {
  example: string;
  exampleBaseUrl: string;
}) => (
  <Callout type="danger" title="Error Loading Example Data">
    <p>
      Error loading Example data for example: <code>{example}</code>
      <br />
      Please check if the file <code>example-metadata.json</code> exists in{' '}
      <code>
        {exampleBaseUrl}/{example}
      </code>
    </p>
  </Callout>
);

const lynxUiConfig = {
  ...rspressAdapter,
  exampleBasePath: '/lynx-ui-examples',
  ssgExampleRoot: path?.join?.(__dirname, '../../docs/public/lynx-ui-examples'),
  explorerUrl: {
    cn: '/zh/guide/start/quick-start.html#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator',
    en: '/guide/start/quick-start.html#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator',
  },
  explorerText: 'Lynx Explorer',
  ErrorComponent,
  SSGComponent,
};

export const GoWithSchema = (props: GoProps) => {
  return (
    <GoConfigProvider config={lynxUiConfig}>
      <GoBase {...props} schemaOptions={optionsData} />
    </GoConfigProvider>
  );
};
