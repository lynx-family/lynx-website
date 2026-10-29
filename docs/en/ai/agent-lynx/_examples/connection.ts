import type { AgentConversationProps } from '@lynx/agent-conversation';

export const connectionExample = {
  prompt:
    "I've connected my Android phone over adb. Can you check whether there are any Lynx pages I can debug?",
  steps: [
    {
      type: 'note',
      content:
        'First I will read the agent-lynx instructions to find out how to discover apps and pages on the device.',
    },
    {
      type: 'tool',
      id: 'skills-list',
      description:
        'Discover the bundled skills and find lynx-devtool for device debugging.',
      command: 'agent-lynx skills list',
      output: `<available_skills>
  <skill>
    <name>lynx-devtool</name>
    <description>Use when working with Lynx DevTool or debugging a Lynx app, page, or device…</description>
    <location>/workspace/node_modules/@lynx-js/skill-lynx-devtool/SKILL.md</location>
  </skill>
  <!-- Other skills omitted. -->
</available_skills>`,
      result: 'Debugging skill found',
    },
    {
      type: 'tool',
      id: 'skills-get',
      description:
        'Load the instructions and get the skill directory and reference file list.',
      command: 'agent-lynx skills get lynx-devtool',
      output: `<skill_content name="lynx-devtool">
Use the \`agent-lynx\` CLI. The published package is \`agent-lynx\`.

<!-- Instructions omitted. -->

Skill directory: /workspace/node_modules/@lynx-js/skill-lynx-devtool
Relative paths in this skill are relative to the skill directory.

<skill_resources>

  <file>references/troubleshooting/index.md</file>
  <!-- Other resources omitted. -->
</skill_resources>
</skill_content>`,
      result: 'Instructions loaded',
    },
    {
      type: 'tool',
      id: 'read-skill',
      name: 'Read · troubleshooting/index.md',
      kind: 'read',
      description:
        'Read the discovery guide relative to the directory returned by skills get.',
      command:
        'Read("/workspace/node_modules/@lynx-js/skill-lynx-devtool/references/troubleshooting/index.md")',
      output: `## Discovery Model

In practice:

- one client usually corresponds to one app process such as \`LynxExplorer\`
- one session corresponds to one Lynx page inside that client
- one device may have multiple clients
- one client may have multiple sessions`,
      result: 'Discovery guide',
    },
    {
      type: 'note',
      content:
        'The guide distinguishes apps from pages. I will first discover the apps available for debugging on the phone.',
    },
    {
      type: 'tool',
      id: 'list-clients',
      description:
        'Discover apps through the local daemon. The returned id is the client ID for subsequent calls.',
      command: 'agent-lynx list-clients',
      output: `[
  {
    "id": "android-phone:8901",
    "info": {
      "App": "LynxExplorer",
      "deviceModel": "Pixel 8",
      "osType": "Android"
    }
  }
]`,
      result: '1 app',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        'Lynx Explorer is running on the Android phone. Next I will check the Lynx pages inside that app.',
    },
    {
      type: 'tool',
      id: 'list-sessions',
      description:
        'Use the client ID from the previous result. Each session_id identifies a debugging context in that app.',
      command: 'agent-lynx list-sessions --client android-phone:8901',
      output: `[
  {
    "session_id": 1,
    "type": "lynx",
    "url": "https://example.com/settings.lynx.bundle"
  }
]`,
      result: '1 Lynx page',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
