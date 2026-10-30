import type { AgentConversationProps } from '@lynx/agent-conversation';

export const runtimeErrorExample = {
  prompt: 'I tapped Ocean, but the theme did not change. Find out why.',
  steps: [
    {
      type: 'note',
      content:
        'I will find the Ocean button, start watching error logs, then tap it again to reproduce the problem.',
    },
    {
      type: 'tool',
      id: 'debug-snapshot',
      name: 'agent-lynx snapshot',
      description:
        'Read the current element refs. This excerpt shows the theme controls; @e15 is the Ocean button container.',
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
      result: 'Ocean button found',
      wrapOutput: false,
    },
    {
      type: 'tool',
      id: 'debug-console',
      name: 'agent-lynx get-console --watch',
      description:
        'Keep this watcher running while the next tap executes. These are the two errors from that tap; the watcher exits after receiving both.',
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
      result: 'Two errors captured',
      defaultOpen: true,
    },
    {
      type: 'tool',
      id: 'debug-tap',
      name: 'agent-lynx tap @e15',
      description:
        'Tap the button from the current snapshot while the console watcher is listening, so the capture covers this action.',
      command: 'agent-lynx tap @e15 --client "$CLIENT_ID" --session 2',
      output:
        'Tapped @e15 at (324,206). Re-run `agent-lynx snapshot` before using refs again.',
      result: 'Tap reproduced',
    },
    {
      type: 'note',
      content:
        'The background VM threw a TypeError while reading ocean. The stack points to background.js; I will find that loaded script’s ID.',
    },
    {
      type: 'tool',
      id: 'debug-sources',
      name: 'agent-lynx get-sources',
      description:
        'List the scripts in the current background VM. app-service.js is present too; this error points to .lynx/main/background.js.',
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
      result: 'Script 5 matched',
    },
    {
      type: 'tool',
      id: 'debug-script-source',
      name: 'agent-lynx cdp --method Debugger.getScriptSource',
      description:
        'Read the actual source for script 5, then use jq to extract lines 484–491 of scriptSource around the failing callback.',
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
      result: 'Failing callback found',
      wrapOutput: false,
    },
    {
      type: 'note',
      content:
        'The callback reads lynx.__globalProps.themeNames[t] before calling setCurrentTheme. I will check themeNames in the same background VM.',
    },
    {
      type: 'tool',
      id: 'debug-runtime-value',
      name: 'agent-lynx evaluate',
      description:
        'Read the configuration field used by the failing expression without changing page state.',
      command:
        'agent-lynx evaluate \'lynx.__globalProps.themeNames\' --thread background --client "$CLIENT_ID" --session 2',
      output: `{
  "result": {
    "type": "undefined"
  }
}`,
      result: 'Field is undefined',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const elementSourceExample = {
  prompt: 'Which JSX creates the Ocean button? Find its tap handler too.',
  steps: [
    {
      type: 'note',
      content:
        'I will take a fresh snapshot, select the Ocean button container, and map that element to its source.',
    },
    {
      type: 'tool',
      id: 'source-snapshot',
      name: 'agent-lynx snapshot',
      description:
        'Refresh the page refs. This excerpt shows the theme controls; @e15 contains the Ocean label.',
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
      result: 'Ocean button found',
      wrapOutput: false,
    },
    {
      type: 'tool',
      id: 'source-location',
      name: 'agent-lynx get-source-info @e15',
      description:
        'Resolve the button’s repository, source file, line, and column using the runtime node and UI source-map metadata.',
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
        'The mapping points to a view at App.tsx line 62. I will read the surrounding JSX to find the handler bound to that node.',
    },
    {
      type: 'tool',
      id: 'source-read',
      name: 'Read · examples/tailwindcss/src/App.tsx',
      description:
        'Read lines 61–80 of the local example checkout. Line 69 contains the failing handler introduced for this reproduction.',
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
      result: 'bindtap found',
      kind: 'read',
      wrapOutput: false,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
