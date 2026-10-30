import type { AgentConversationProps } from '@lynx/agent-conversation';

const target = '--client android-phone:8901 --session 1';

const themeSnapshot = `@e1 [scroll-view] @(207,426) {scrollable}
└─ @e2 [view] @(207,436)
   ├─ @e3 [view] @(207,46)
   │  ├─ @e4 [text] "Settings" @(207,35)
   │  └─ …
   ├─ @e6 [view] @(207,153)
   │  ├─ …
   │  └─ @e10 [view] @(207,183)
   │     ├─ …
   │     └─ @e15 [view] @(324,182)
   │        └─ @e16 [text] "Ocean" @(323,183)
   └─ …`;

export const themeExample = {
  prompt: '把刚才那个 Settings 页切换到 Ocean 主题，帮我确认是否生效。',
  steps: [
    {
      type: 'note',
      content: '先查看页面结构，找到 Ocean 按钮，并记录切换前的背景色。',
    },
    {
      type: 'tool',
      id: 'theme-snapshot-before',
      description: '检查上一节选中的页面。这里只展示与主题切换有关的快照分支。',
      command: `agent-lynx snapshot ${target}`,
      output: themeSnapshot,
      wrapOutput: false,
      result: '找到 Ocean 按钮',
      defaultOpen: true,
    },
    {
      type: 'tool',
      id: 'theme-style-before',
      description: '读取页面根容器的计算样式，留作切换后的对照。',
      command: `agent-lynx get style @e1 --property background-color ${target}`,
      output: 'background-color: rgba(9, 9, 11, 1)',
      result: '记录当前背景色',
    },
    {
      type: 'note',
      content:
        'Ocean 文字位于 @e15 按钮内。我会点击这个容器，再检查页面的实际变化。',
    },
    {
      type: 'tool',
      id: 'theme-tap',
      description:
        '点击当前快照中的 Ocean 按钮，并刷新 daemon 缓存的元素引用。',
      command: `agent-lynx tap @e15 --snapshot ${target}`,
      output: 'Tapped @e15 at (324,182). Snapshot refreshed with 69 refs.',
      result: '已点击并刷新快照',
    },
    {
      type: 'note',
      content: '接着读取新快照，重新确认页面根节点，再比较它的背景色。',
    },
    {
      type: 'tool',
      id: 'theme-snapshot-after',
      description:
        '读取操作后的元素树。主题切换后结构相同，这里仍节选主题分支。',
      command: `agent-lynx snapshot ${target}`,
      output: themeSnapshot,
      wrapOutput: false,
      result: '确认最新元素引用',
    },
    {
      type: 'tool',
      id: 'theme-style-after',
      description: '使用新快照中的根节点读取背景色，核对主题是否发生变化。',
      command: `agent-lynx get style @e1 --property background-color ${target}`,
      output: 'background-color: rgba(15, 23, 42, 1)',
      result: '背景色已改变',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const scrollExample = {
  prompt: '再看看这个页面底部还有什么内容，只查看，不用点击按钮。',
  steps: [
    {
      type: 'note',
      content: '先检查完整快照，找到滚动容器和当前屏幕外的内容。',
    },
    {
      type: 'tool',
      id: 'scroll-snapshot-before',
      description: '完整快照也包含屏幕外的节点。这里只展示页面底部的分支。',
      command: `agent-lynx snapshot ${target}`,
      wrapOutput: false,
      output: `@e1 [scroll-view] @(207,426) {scrollable}
└─ @e2 [view] @(207,436)
   ├─ …
   └─ @e61 [view] @(207,816)
      ├─ @e62 [view] @(207,818)
      │  ├─ @e63 [text] "Danger Zone" @(207,808)
      │  └─ @e64 [text] "Irreversible and destructive actions." @(207,832)
      └─ @e65 [view] @(207,871) {offscreen}
         ├─ @e66 [view] @(91,871) {offscreen}
         │  └─ @e67 [text] "Delete Account" @(91,871) {offscreen}
         └─ @e68 [view] @(186,871) {offscreen}
            └─ @e69 [text] "Cancel" @(186,871) {offscreen}`,
      result: '底部按钮在屏幕外',
    },
    {
      type: 'note',
      content:
        '底部节点带有 offscreen 标记。我会向下滚动 @e1，再查看可见区域。',
    },
    {
      type: 'tool',
      id: 'scroll-down',
      description: '滚动最新快照中标为 scrollable 的容器，并刷新元素引用。',
      command: `agent-lynx scroll @e1 --direction down --snapshot ${target}`,
      output: 'Scrolled @e1 down. Snapshot refreshed with 69 refs.',
      result: '已向下滚动',
    },
    {
      type: 'tool',
      id: 'scroll-snapshot-after',
      description:
        '读取滚动后的可见元素。底部节点已进入视口，以下节选对应分支。',
      command: `agent-lynx snapshot --visible-only ${target}`,
      wrapOutput: false,
      output: `@e1 [scroll-view] @(207,426) {scrollable}
└─ @e2 [view] @(207,376)
   ├─ …
   └─ @e61 [view] @(207,756)
      ├─ @e62 [view] @(207,758)
      │  ├─ @e63 [text] "Danger Zone" @(207,748)
      │  └─ @e64 [text] "Irreversible and destructive actions." @(207,772)
      └─ @e65 [view] @(207,811)
         ├─ @e66 [view] @(91,811)
         │  └─ @e67 [text] "Delete Account" @(91,811)
         └─ @e68 [view] @(186,811)
            └─ @e69 [text] "Cancel" @(186,811)`,
      result: '确认底部可见内容',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
