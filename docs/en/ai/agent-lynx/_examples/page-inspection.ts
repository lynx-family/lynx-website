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
  prompt:
    'Switch that Settings page to the Ocean theme and check that it worked.',
  steps: [
    {
      type: 'note',
      content:
        'I will inspect the page, find the Ocean button, and record the current background color.',
    },
    {
      type: 'tool',
      id: 'theme-snapshot-before',
      description:
        'Inspect the page selected in the connection guide. This excerpt shows the theme controls.',
      command: `agent-lynx snapshot ${target}`,
      output: themeSnapshot,
      wrapOutput: false,
      result: 'Ocean button found',
      defaultOpen: true,
    },
    {
      type: 'tool',
      id: 'theme-style-before',
      description:
        'Read the root container’s computed style to compare with the result after switching themes.',
      command: `agent-lynx get style @e1 --property background-color ${target}`,
      output: 'background-color: rgba(9, 9, 11, 1)',
      result: 'Current color recorded',
    },
    {
      type: 'note',
      content:
        'The Ocean label is inside the @e15 button. I will tap that container, then inspect the change.',
    },
    {
      type: 'tool',
      id: 'theme-tap',
      description:
        'Tap the Ocean button from the current snapshot and refresh the refs cached by the daemon.',
      command: `agent-lynx tap @e15 --snapshot ${target}`,
      output: 'Tapped @e15 at (324,182). Snapshot refreshed with 69 refs.',
      result: 'Tapped; snapshot refreshed',
    },
    {
      type: 'note',
      content:
        'Next I will read the new snapshot, identify the page root again, and compare its background color.',
    },
    {
      type: 'tool',
      id: 'theme-snapshot-after',
      description:
        'Read the tree after the action. The theme change preserves its structure; this excerpt shows the same branch.',
      command: `agent-lynx snapshot ${target}`,
      output: themeSnapshot,
      wrapOutput: false,
      result: 'Fresh refs confirmed',
    },
    {
      type: 'tool',
      id: 'theme-style-after',
      description:
        'Use the root ref from the new snapshot to check whether the background color changed.',
      command: `agent-lynx get style @e1 --property background-color ${target}`,
      output: 'background-color: rgba(15, 23, 42, 1)',
      result: 'Background color changed',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const scrollExample = {
  prompt:
    'Now check what else is at the bottom of this page. Just look; don’t tap any buttons.',
  steps: [
    {
      type: 'note',
      content:
        'I will inspect the full snapshot to find the scroll container and the content outside the viewport.',
    },
    {
      type: 'tool',
      id: 'scroll-snapshot-before',
      description:
        'The full snapshot includes offscreen nodes. This excerpt shows the bottom of the page.',
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
      result: 'Bottom buttons are offscreen',
    },
    {
      type: 'note',
      content:
        'The bottom nodes are marked offscreen. I will scroll @e1 down, then inspect the visible content.',
    },
    {
      type: 'tool',
      id: 'scroll-down',
      description:
        'Scroll the container marked scrollable in the latest snapshot, then refresh the refs.',
      command: `agent-lynx scroll @e1 --direction down --snapshot ${target}`,
      output: 'Scrolled @e1 down. Snapshot refreshed with 69 refs.',
      result: 'Scrolled down',
    },
    {
      type: 'tool',
      id: 'scroll-snapshot-after',
      description:
        'Read the visible elements after scrolling. This excerpt shows the bottom nodes now inside the viewport.',
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
      result: 'Visible content confirmed',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
