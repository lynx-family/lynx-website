// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useLang } from '@rspress/core/runtime';

const ClassRenderPropPreamble = () => {
  const isZh = useLang() === 'zh';
  if (isZh) {
    return (
      <>
        <h3>基于状态的样式与渲染</h3>
        <p>
          该组件通过以下一种或两种方式暴露运行时状态。下表仅展示每个状态实际支持的方式：
        </p>
        <ul>
          <li>
            <strong>UI variant class</strong>：支持时，对应组件节点会动态加上{' '}
            <code>{'ui-<state>'}</code> 形式的类名，可用{' '}
            <code>{'.ui-<state> { ... }'}</code> 选择器定制样式；
          </li>
          <li>
            <strong>Render-prop 字段</strong>：支持时，当 <code>children</code>{' '}
            传入函数，状态会以{' '}
            <code>{'children({ <state>: boolean, ... })'}</code>{' '}
            的形式作为参数传入，便于在运行时做条件渲染。
          </li>
        </ul>
      </>
    );
  }
  return (
    <>
      <h3>State-based styling & rendering</h3>
      <p>
        This component exposes runtime states through one or both of the
        following channels. The table lists only the channels available for each
        state:
      </p>
      <ul>
        <li>
          <strong>UI variant class</strong> — when supported, a class like{' '}
          <code>{'ui-<state>'}</code> is toggled on the corresponding component
          node for selectors such as <code>{'.ui-<state> { ... }'}</code>.
        </li>
        <li>
          <strong>Render-prop field</strong> — when supported and{' '}
          <code>children</code> is a function, the state is passed in via{' '}
          <code>{'children({ <state>: boolean, ... })'}</code> for
          runtime-driven rendering.
        </li>
      </ul>
    </>
  );
};

export { ClassRenderPropPreamble };
