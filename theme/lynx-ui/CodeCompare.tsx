// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React from 'react';

export const CodeCompare = () => {
  return (
    <div
      style={{
        width: '80%',
        display: 'flex',
        flexDirection: 'row',
        margin: 'auto',
        marginTop: '40px',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          width: '40%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>标准元件代码</div>
        <img src="assets/listCode.png" style={{ width: '100%' }}></img>
      </div>

      <div
        style={{
          width: '40%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>lynx-ui 代码</div>
        <img
          src="assets/listComponentCode.jpeg"
          style={{ width: '100%' }}
        ></img>
      </div>
    </div>
  );
};
