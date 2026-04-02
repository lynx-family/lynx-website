// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import './styles.css';
import { Button as ButtonInner } from '@lynx-js/lynx-ui';

const ButtonStyle = {
  border: '1px solid',
  'border-radius': '4px',
  width: '150px',
  'background-color': 'red',
  margin: '4px 8px',
  padding: '4px 8px',
};

const ButtonTextStyle = {
  color: 'white',
};

export function Button(props: { onClick: () => void; text: string }) {
  return (
    <ButtonInner style={ButtonStyle} onClick={props.onClick}>
      <text style={ButtonTextStyle}>{props.text}</text>
    </ButtonInner>
  );
}
