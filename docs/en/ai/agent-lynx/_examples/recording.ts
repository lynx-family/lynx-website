import type { AgentConversationProps } from '@lynx/agent-conversation';

export const recorderExample = {
  prompt:
    'Save opening Settings and switching to Ocean as a Recorder replay file so I can reproduce that page state.',
  steps: [
    {
      type: 'note',
      content:
        'I will read the recording skill to establish when capture must begin to include replay initialization.',
    },
    {
      type: 'tool',
      id: 'recorder-skills',
      name: 'agent-lynx skills list',
      description:
        'Excerpt the recording and fixture skills: first create a replay file, then inspect it.',
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
      result: 'Recording and fixture skills found',
    },
    {
      type: 'tool',
      id: 'recorder-skill',
      name: 'agent-lynx skills get lynx-recorder',
      description:
        'Excerpt the workflow: start first, open the page, then check savedFiles.',
      command: 'agent-lynx skills get lynx-recorder',
      output: `## Workflow

1. **Start before opening the page.** Run \`recorder start\`. Capture must begin *before* the target page loads so the recording includes \`loadTemplate\`.
2. **If \`start\` reports \`restartRequired: true\`**, \`enable_debug_mode\` was just enabled — restart the app and run \`recorder start\` again (see Notes).
3. **Open and interact.** Open (or reload) the target Lynx page and perform the interactions to capture.
4. **Stop and save.** Run \`recorder end --output ./my-recording.json\`. Report the absolute path(s) returned in \`savedFiles\` to the user.

…

Skill directory: /tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-recorder`,
      result: 'Template load required',
    },
    {
      type: 'tool',
      id: 'recorder-start',
      name: 'agent-lynx recorder start',
      description:
        'Start Recorder so the next page’s template load is included.',
      command: 'agent-lynx recorder start --client "$CLIENT_ID"',
      output: `{
  "success": true,
  "started": true,
  "restartRequired": false,
  "message": "Recording started successfully. Open or reload a Lynx page before \`recorder end\`."
}`,
      result: 'Recording started',
      defaultOpen: false,
    },
    {
      type: 'tool',
      id: 'recorder-open',
      name: 'agent-lynx open',
      description:
        'Open Settings after recording starts and select the new page’s session 3 from the response.',
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
      result: 'New page: session 3',
    },
    {
      type: 'tool',
      id: 'recorder-snapshot',
      name: 'agent-lynx snapshot',
      description:
        'Read fresh element refs in the new page; the theme controls including Ocean are excerpted.',
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
      result: 'Ocean is @e15',
      wrapOutput: false,
    },
    {
      type: 'tool',
      id: 'recorder-tap',
      name: 'agent-lynx tap @e15',
      description:
        'Switch themes during recording so the runtime input is included in the replay data.',
      command: 'agent-lynx tap @e15 --client "$CLIENT_ID" --session 3',
      output:
        'Tapped @e15 at (324,206). Re-run `agent-lynx snapshot` before using refs again.',
      result: 'Ocean tapped',
    },
    {
      type: 'tool',
      id: 'recorder-save',
      name: 'agent-lynx recorder end',
      description:
        'Stop recording and use the returned savedFiles; the runtime may split files by session. jq retains paths and complete diagnostics.',
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
      result: 'Replay artifact includes template load',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        'Diagnostics confirm template loading and runtime input. I will load the fixture skill to inspect the saved file’s structure.',
    },
    {
      type: 'tool',
      id: 'recorder-fixture-skill',
      name: 'agent-lynx skills get lynx-recorder-fixture',
      description:
        'Excerpt the fixture inspection entry point; this skill provides local decoding and summary tools.',
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
      result: 'Fixture summary tool loaded',
    },
    {
      type: 'tool',
      id: 'recorder-fixture-summary',
      name: 'python3 · fixture_tool.py summary',
      description:
        'FIXTURE_SKILL_DIR is the directory returned above. Use the actual savedFiles filename; the tool also handles encoded TestBench files.',
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
      result: '13 runtime actions',
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
