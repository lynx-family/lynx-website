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
          该组件将每一项内部状态通过<strong>两条等价通道</strong>
          同时对外暴露，下表逐行给出两者的对应关系：
        </p>
        <ul>
          <li>
            <strong>CSS className</strong>：根节点上会动态加上{' '}
            <code>{'ui-<state>'}</code> 形式的类名，可直接用{' '}
            <code>{'.ui-<state> { ... }'}</code> 选择器定制样式；
          </li>
          <li>
            <strong>Render-prop 字段</strong>：当 <code>children</code>{' '}
            传入函数时，同一个状态会以{' '}
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
        This component exposes each of its internal states through{' '}
        <strong>two interchangeable channels</strong>, and the table below maps
        them one-to-one:
      </p>
      <ul>
        <li>
          <strong>CSS className</strong> — a class like{' '}
          <code>{'ui-<state>'}</code> is toggled on the root node, so you can
          style it with selectors such as <code>{'.ui-<state> { ... }'}</code>.
        </li>
        <li>
          <strong>Render-prop field</strong> — when <code>children</code> is a
          function, the same state is passed in via{' '}
          <code>{'children({ <state>: boolean, ... })'}</code> for
          runtime-driven rendering.
        </li>
      </ul>
    </>
  );
};

export { ClassRenderPropPreamble };
