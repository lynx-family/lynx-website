import type { AgentConversationProps } from '@lynx/agent-conversation';

export const runtimeErrorExample = {
  prompt: '点了 Ocean，但主题没有切换，帮我查一下原因。',
  steps: [
    {
      type: 'note',
      content: '先找到 Ocean 按钮，启动错误日志监听，再点击一次复现问题。',
    },
    {
      type: 'tool',
      id: 'debug-snapshot',
      name: 'agent-lynx snapshot',
      description:
        '读取当前页面的元素引用；这里节选主题区域，Ocean 的按钮容器是 @e15。',
      command: 'agent-lynx snapshot --client "$CLIENT_ID" --session 2',
      output: `@e1 [scroll-view] @(207,450) {scrollable}
└─ @e2 [view] @(207,460)
   ├─ @e3 [view] @(207,70)
   │  ├─ @e4 [text] "Settings" @(207,59)
   │  └─ @e5 [text] "Manage your account and preferences." @(207,86)
   ├─ @e6 [view] @(207,177)
   │  ├─ @e7 [view] @(207,153)
   │  │  ├─ @e8 [text] "Theme" @(207,143)
   │  │  └─ @e9 [text] "Switch design tokens at runtime via CSS variables." @(207,167)
   │  └─ @e10 [view] @(207,207)
   │     ├─ @e11 [view] @(91,206)
   │     │  └─ @e12 [text] "Dark" @(91,206)
   │     ├─ @e13 [view] @(207,206)
   │     │  └─ @e14 [text] "Light" @(208,206)
   │     └─ @e15 [view] @(324,206)
   │        └─ @e16 [text] "Ocean" @(323,206)`,
      result: '找到 Ocean 按钮',
      wrapOutput: false,
    },
    {
      type: 'tool',
      id: 'debug-console',
      name: 'agent-lynx get-console --watch',
      description:
        '先保持日志监听运行，再执行下一步点击。下面是这次点击产生的两条错误；收到两条后，监听自动结束。',
      command:
        'agent-lynx get-console --watch --level error --limit 2 --client "$CLIENT_ID" --session 2',
      output: `[11:25:29.411Z] [error/background] The following error occurred in the JSRuntime:
    at file://shared/lynx_core.js:2:10030
    at file://shared/lynx_core.js:8:21708
    at file://shared/lynx_core.js:8:21934
    at file://shared/lynx_core.js:8:5388
    at file://view3/.lynx/main/background.js:9055:27
[11:25:29.411Z] [error/background] TypeError: cannot read property 'ocean' of undefined
    at <anonymous> (file://view3/.lynx/main/background.js:487:73)
    at publishEvent (file://view3/.lynx/main/background.js:9054:27)

    at file://shared/lynx_core.js:3:27
    at file://shared/lynx_core.js:8:21708
    at file://shared/lynx_core.js:8:21934
    at file://shared/lynx_core.js:8:5388
    at file://view3/.lynx/main/background.js:9055:27`,
      result: '捕获两条错误',
      defaultOpen: true,
    },
    {
      type: 'tool',
      id: 'debug-tap',
      name: 'agent-lynx tap @e15',
      description:
        '在日志监听期间点击当前快照中的按钮，让同一次操作的错误进入采集窗口。',
      command: 'agent-lynx tap @e15 --client "$CLIENT_ID" --session 2',
      output:
        'Tapped @e15 at (324,206). Re-run `agent-lynx snapshot` before using refs again.',
      result: '已复现点击',
    },
    {
      type: 'note',
      content:
        '后台 VM 抛出了读取 ocean 的 TypeError。调用栈指向 background.js，先找到这份运行中脚本的 ID。',
    },
    {
      type: 'tool',
      id: 'debug-sources',
      name: 'agent-lynx get-sources',
      description:
        '列出当前后台 VM 的脚本。app-service.js 也在列表中；本次错误对应的是 .lynx/main/background.js。',
      command: 'agent-lynx get-sources --client "$CLIENT_ID" --session 2',
      output: `[
  {
    "scriptId": "1",
    "url": "file://shared/lynx_core.js"
  },
  {
    "scriptId": "4",
    "url": "file://view3/app-service.js"
  },
  {
    "scriptId": "5",
    "url": "file://view3/.lynx/main/background.js"
  }
]`,
      result: '匹配到脚本 5',
    },
    {
      type: 'tool',
      id: 'debug-script-source',
      name: 'agent-lynx cdp --method Debugger.getScriptSource',
      description:
        '读取脚本 5 的真实代码，再用 jq 提取 scriptSource 的第 484–491 行，查看调用栈附近的点击回调。',
      command:
        'agent-lynx cdp --thread background --method Debugger.getScriptSource \'{"scriptId":"5"}\' --client "$CLIENT_ID" --session 2 | jq -r \'.scriptSource | split("\\n")[483:491][]\'',
      output: `        $0: themeNames.map((t)=>/*#__PURE__*/ (0,_lynx_js_react_jsx_dev_runtime__rspack_import_0.jsxDEV)(__snapshot_835da_abf5c_2, {
                values: [
                    \`flex-1 rounded-md py-2 items-center justify-center border \${currentTheme === t ? "bg-primary border-primary" : "bg-secondary border-border"}\`,
                    ()=>setCurrentTheme(lynx.__globalProps.themeNames[t]),
                    \`text-sm font-medium \${currentTheme === t ? "text-primary-foreground" : "text-secondary-foreground"}\`
                ],
                $0: t[0].toUpperCase() + t.slice(1)
            }, t, false, {`,
      result: '找到出错的回调',
      wrapOutput: false,
    },
    {
      type: 'note',
      content:
        '回调在调用 setCurrentTheme 前先读取 lynx.__globalProps.themeNames[t]。检查当前后台 VM 中的 themeNames 是否存在。',
    },
    {
      type: 'tool',
      id: 'debug-runtime-value',
      name: 'agent-lynx evaluate',
      description: '读取报错表达式中的配置字段，不修改页面状态。',
      command:
        'agent-lynx evaluate \'lynx.__globalProps.themeNames\' --thread background --client "$CLIENT_ID" --session 2',
      output: `{
  "result": {
    "type": "undefined"
  }
}`,
      result: '字段为 undefined',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const elementSourceExample = {
  prompt: 'Ocean 按钮对应哪段 JSX？把它的点击处理函数也找出来。',
  steps: [
    {
      type: 'note',
      content:
        '重新读取页面快照，选中 Ocean 的按钮容器，再把这个元素映射到源码。',
    },
    {
      type: 'tool',
      id: 'source-snapshot',
      name: 'agent-lynx snapshot',
      description:
        '刷新当前页面的引用；这里节选主题区域，使用包含 Ocean 文本的 @e15 容器。',
      command: 'agent-lynx snapshot --client "$CLIENT_ID" --session 1',
      output: `@e1 [scroll-view] @(207,450) {scrollable}
└─ @e2 [view] @(207,460)
   ├─ @e3 [view] @(207,70)
   │  ├─ @e4 [text] "Settings" @(207,59)
   │  └─ @e5 [text] "Manage your account and preferences." @(207,86)
   ├─ @e6 [view] @(207,177)
   │  ├─ @e7 [view] @(207,153)
   │  │  ├─ @e8 [text] "Theme" @(207,143)
   │  │  └─ @e9 [text] "Switch design tokens at runtime via CSS variables." @(207,167)
   │  └─ @e10 [view] @(207,207)
   │     ├─ @e11 [view] @(91,206)
   │     │  └─ @e12 [text] "Dark" @(91,206)
   │     ├─ @e13 [view] @(207,206)
   │     │  └─ @e14 [text] "Light" @(208,206)
   │     └─ @e15 [view] @(324,206)
   │        └─ @e16 [text] "Ocean" @(323,206)`,
      result: '找到 Ocean 按钮',
      wrapOutput: false,
    },
    {
      type: 'tool',
      id: 'source-location',
      name: 'agent-lynx get-source-info @e15',
      description:
        '根据运行时节点和 UI source-map 元数据，解析该按钮的仓库、源文件、行和列。',
      command:
        'agent-lynx get-source-info @e15 --client "$CLIENT_ID" --session 1',
      output: `{
  "debugMetadataUrl": "http://127.0.0.1:33127/.lynx/main/debug-metadata.json",
  "lazyBundleUrl": null,
  "nodeId": 82,
  "nodeIndex": 713223749,
  "tag": "view",
  "repo": "lynx-family/lynx-examples",
  "source": "/tmp/agent-lynx-real-debugging-20261030/lynx-examples/examples/tailwindcss/src/App.tsx",
  "line": 62,
  "column": 15,
  "status": "mapped",
  "reason": null
}`,
      result: 'App.tsx:62:15',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        '映射指向 App.tsx 第 62 行的 view。读取附近的 JSX，查看这个节点绑定的事件处理函数。',
    },
    {
      type: 'tool',
      id: 'source-read',
      name: 'Read · examples/tailwindcss/src/App.tsx',
      description:
        '读取本地示例副本中的第 61–80 行；第 69 行是本次复现加入的出错回调。',
      command: 'Read examples/tailwindcss/src/App.tsx:61–80',
      output: `    61	            {themeNames.map((t) => (
    62	              <view
    63	                key={t}
    64	                className={\`flex-1 rounded-md py-2 items-center justify-center border \${
    65	                  currentTheme === t
    66	                    ? "bg-primary border-primary"
    67	                    : "bg-secondary border-border"
    68	                }\`}
    69	                bindtap={() => setCurrentTheme(lynx.__globalProps.themeNames[t])}
    70	              >
    71	                <text
    72	                  className={\`text-sm font-medium \${
    73	                    currentTheme === t
    74	                      ? "text-primary-foreground"
    75	                      : "text-secondary-foreground"
    76	                  }\`}
    77	                >
    78	                  {t[0].toUpperCase() + t.slice(1)}
    79	                </text>
    80	              </view>`,
      result: '找到 bindtap',
      kind: 'read',
      wrapOutput: false,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
