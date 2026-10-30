import type { AgentConversationProps } from '@lynx/agent-conversation';

export const recorderExample = {
  prompt:
    '把 Settings 页面打开后切换到 Ocean 的过程保存成 Recorder 回放文件，我要用它复现这个页面状态。',
  steps: [
    {
      type: 'note',
      content: '先读取录制 skill，确认回放需要的初始化数据从什么时候开始采集。',
    },
    {
      type: 'tool',
      id: 'recorder-skills',
      name: 'agent-lynx skills list',
      description: '节选录制与产物检查 skill：先创建回放文件，再检查其内容。',
      command: 'agent-lynx skills list',
      output: `<available_skills>
  <skill>
    <name>lynx-recorder</name>
    <description>Record Lynx page interactions into a TestBench replay file using agent-lynx. Use when asked to start or stop a recording, capture page interactions for replay, or troubleshoot recording capture. For inspecting or editing an existing fixture, use lynx-recorder-fixture.</description>
    <location>/tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-recorder/SKILL.md</location>
  </skill>
  <skill>
    <name>lynx-recorder-fixture</name>
    <description>Inspect, decode, edit, and re-encode existing Lynx Recorder / TestBench fixtures. Use to analyze recordings, change mock responses, Action List, Callback, or Config, and troubleshoot replay inputs. Use lynx-recorder to create a new recording.</description>
    <location>/tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-recorder-fixture/SKILL.md</location>
  </skill>
</available_skills>`,
      result: '找到两个相关 skill',
    },
    {
      type: 'tool',
      id: 'recorder-skill',
      name: 'agent-lynx skills get lynx-recorder',
      description: '节选录制流程：先 start，再打开页面，最后检查 savedFiles。',
      command: 'agent-lynx skills get lynx-recorder',
      output: `## Workflow

1. **Start before opening the page.** Run \`recorder start\`. Capture must begin *before* the target page loads so the recording includes \`loadTemplate\`.
2. **If \`start\` reports \`restartRequired: true\`**, \`enable_debug_mode\` was just enabled — restart the app and run \`recorder start\` again (see Notes).
3. **Open and interact.** Open (or reload) the target Lynx page and perform the interactions to capture.
4. **Stop and save.** Run \`recorder end --output ./my-recording.json\`. Report the absolute path(s) returned in \`savedFiles\` to the user.

…

Skill directory: /tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-recorder`,
      result: '需要包含 loadTemplate',
    },
    {
      type: 'tool',
      id: 'recorder-start',
      name: 'agent-lynx recorder start',
      description: '先开始 Recorder，确保随后打开页面时的模板加载进入录制。',
      command: 'agent-lynx recorder start --client "$CLIENT_ID"',
      output: `{
  "success": true,
  "started": true,
  "restartRequired": false,
  "message": "Recording started successfully. Open or reload a Lynx page before \`recorder end\`."
}`,
      result: '录制已开始',
      defaultOpen: false,
    },
    {
      type: 'tool',
      id: 'recorder-open',
      name: 'agent-lynx open',
      description: '录制开始后打开 Settings；从响应中提取新页面的 session 3。',
      command:
        "agent-lynx open 'http://127.0.0.1:33227/main.lynx.bundle?fullscreen=true' --client \"$CLIENT_ID\" | jq '.data.data'",
      output: `[
  {
    "session_id": 2,
    "type": "",
    "url": "http://127.0.0.1:33227/main.lynx.bundle?fullscreen=true"
  },
  {
    "session_id": 3,
    "type": "",
    "url": "http://127.0.0.1:33227/main.lynx.bundle?fullscreen=true"
  }
]`,
      result: '新页面 session 3',
    },
    {
      type: 'tool',
      id: 'recorder-snapshot',
      name: 'agent-lynx snapshot',
      description:
        '读取新页面中的元素引用；这里节选包含 Ocean 按钮的主题区域。',
      command: 'agent-lynx snapshot --client "$CLIENT_ID" --session 3',
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
      result: 'Ocean 是 @e15',
      wrapOutput: false,
    },
    {
      type: 'tool',
      id: 'recorder-tap',
      name: 'agent-lynx tap @e15',
      description: '在录制期间触发主题切换，让运行时输入进入回放数据。',
      command: 'agent-lynx tap @e15 --client "$CLIENT_ID" --session 3',
      output:
        'Tapped @e15 at (324,206). Re-run `agent-lynx snapshot` before using refs again.',
      result: '已点击 Ocean',
    },
    {
      type: 'tool',
      id: 'recorder-save',
      name: 'agent-lynx recorder end',
      description:
        '结束录制，并读取实际返回的 savedFiles；运行时可能按 session 拆分文件。jq 保留文件路径和完整诊断。',
      command:
        'agent-lynx recorder end --client "$CLIENT_ID" -o ./settings-recording.json | jq \'{success, savedFiles, diagnostics}\'',
      output: `{
  "success": true,
  "savedFiles": [
    "/tmp/agent-lynx-perf-docs-20261030/settings-recording-session3.json"
  ],
  "diagnostics": [
    {
      "file": "/tmp/agent-lynx-perf-docs-20261030/settings-recording-session3.json",
      "fileSizeBytes": 80792,
      "healthy": true,
      "actions": 13,
      "hasTemplate": true,
      "functionDistribution": {
        "setThreadStrategy": 1,
        "updateViewPort": 2,
        "setGlobalProps": 1,
        "loadTemplate": 1,
        "SendCustomEvent": 1,
        "sendGlobalEvent": 2,
        "SendTouchEvent": 3,
        "sendEventAndroid": 2
      },
      "verdict": "Valid recording — includes template load and interaction data"
    }
  ]
}`,
      result: '含模板加载的回放产物',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        '诊断确认文件包含模板和运行时输入。再加载 fixture skill，检查保存下来的文件结构。',
    },
    {
      type: 'tool',
      id: 'recorder-fixture-skill',
      name: 'agent-lynx skills get lynx-recorder-fixture',
      description: '节选 fixture 检查入口；该 skill 提供本地解码与摘要脚本。',
      command: 'agent-lynx skills get lynx-recorder-fixture',
      output: `## Inspect and edit

The tool requires Python 3 and uses only the standard library. \`decode\`, \`summary\`, and \`roundtrip\` accept a local file or HTTP(S) URL; \`encode\` accepts a local decoded JSON file.

\`\`\`bash
SKILL_DIR="<directory containing this SKILL.md>"
SOURCE="./recording.json"

# Start with a summary to identify the sections to inspect.
python3 "$SKILL_DIR/scripts/fixture_tool.py" summary "$SOURCE"

# Decode when you need to inspect or edit the contents.
python3 "$SKILL_DIR/scripts/fixture_tool.py" decode "$SOURCE" -o decoded.json

# After editing decoded.json as requested, write a new encoded file.
python3 "$SKILL_DIR/scripts/fixture_tool.py" encode decoded.json -o edited.fixture
\`\`\`

…

Skill directory: /tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-recorder-fixture`,
      result: '使用 fixture 摘要脚本',
    },
    {
      type: 'tool',
      id: 'recorder-fixture-summary',
      name: 'python3 · fixture_tool.py summary',
      description:
        'FIXTURE_SKILL_DIR 是上一步返回的目录；使用 savedFiles 中的实际文件名，兼容编码后的 TestBench 文件。',
      command:
        'python3 "$FIXTURE_SKILL_DIR/scripts/fixture_tool.py" summary ./settings-recording-session3.json',
      output: `=== TestBench Fixture Summary ===

Top-level keys: ['Action List', 'Invoked Method Data', 'Callback', 'Component List', 'Debug Info', 'SharedData', 'Scripts', 'Config']

Config:
  Screen: 1280.0 x 2707.0
  JSB Settings: {'strict': True}

Action List: 13 entries
  SendTouchEvent: 3
  updateViewPort: 2
  sendGlobalEvent: 2
  sendEventAndroid: 2
  setThreadStrategy: 1
  setGlobalProps: 1
  loadTemplate: 1
  SendCustomEvent: 1

Invoked Method Data: 0 entries

Callback: 0 entries

Component List: ['scroll-view', 'view', 'text', 'raw-text']`,
      result: '13 条运行时操作',
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
