import type { AgentConversationProps } from '@lynx/agent-conversation';

export const connectionExample = {
  prompt: '我已通过adb连接android手机，你帮我看看有没有可以调试的Lynx页面？',
  caption:
    '模拟对话，输出已节选。设备 ID、文件路径与页面地址为示例，请以工具实际返回的值为准。',
  steps: [
    {
      type: 'note',
      content: '先读取 agent-lynx 的使用说明，确认如何查找设备上的应用和页面。',
    },
    {
      type: 'tool',
      id: 'skills-list',
      name: 'skills list',
      description:
        '发现 CLI 自带的 skills，找到与设备调试相关的 lynx-devtool。',
      command: 'agent-lynx skills list',
      output: `<available_skills>
  <skill>
    <name>lynx-devtool</name>
    <description>Use when working with Lynx DevTool or debugging a Lynx app, page, or device…</description>
    <location>/workspace/node_modules/@lynx-js/skill-lynx-devtool/SKILL.md</location>
  </skill>
  <!-- Other skills omitted. -->
</available_skills>`,
      result: '找到调试 skill',
    },
    {
      type: 'tool',
      id: 'skills-get',
      name: 'skills get lynx-devtool',
      description: '加载使用说明，并取得 skill 的目录和参考文件清单。',
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
      result: '说明已加载',
    },
    {
      type: 'tool',
      id: 'read-skill',
      name: 'Read · troubleshooting/index.md',
      kind: 'read',
      description: '按 skills get 返回的目录，读取设备、应用与页面的发现指南。',
      command:
        'Read("/workspace/node_modules/@lynx-js/skill-lynx-devtool/references/troubleshooting/index.md")',
      output: `## Discovery Model

In practice:

- one client usually corresponds to one app process such as \`LynxExplorer\`
- one session corresponds to one Lynx page inside that client
- one device may have multiple clients
- one client may have multiple sessions`,
      result: '连接指南',
    },
    {
      type: 'note',
      content: '连接指南区分了应用和页面。我先找这台手机上可调试的应用。',
    },
    {
      type: 'tool',
      id: 'list-clients',
      name: 'list-clients',
      description:
        '默认通过本地 daemon 发现应用；返回值中的 id 是后续调用使用的 client ID。',
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
      result: '1 个应用',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        '找到了 Android 手机上的 Lynx Explorer；继续查看这个应用里的 Lynx 页面。',
    },
    {
      type: 'tool',
      id: 'list-sessions',
      name: 'list-sessions',
      description:
        '使用上一步返回的 client ID 查询页面；session_id 标识这个应用里的调试上下文。',
      command: 'agent-lynx list-sessions --client android-phone:8901',
      output: `[
  {
    "session_id": 1,
    "type": "lynx",
    "url": "https://example.com/settings.lynx.bundle"
  }
]`,
      result: '1 个 Lynx 页面',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'caption' | 'steps'>;
