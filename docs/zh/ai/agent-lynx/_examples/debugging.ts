import type { AgentConversationProps } from '@lynx/agent-conversation';

const target = '--client android-phone:8901 --session 2';

const profileScript = `async function loadProfile() {
  const apiBaseUrl = lynx.__globalProps.apiBaseUrl;
  if (!apiBaseUrl) {
    console.error("[profile] Missing apiBaseUrl");
    return;
  }
  const response = await fetch(apiBaseUrl + "/profile");
  return response.json();
}`;

export const configurationExample = {
  prompt: '刚才点了 Load Profile，但用户资料没有显示出来，帮我查一下原因。',
  steps: [
    {
      type: 'note',
      content: '先读取这个页面的错误和警告日志，确认涉及的 VM 线程和脚本。',
    },
    {
      type: 'tool',
      id: 'debug-console',
      name: 'agent-lynx get-console',
      description:
        '读取选定页面的错误和警告，日志包含所属 VM 线程和可用的调用栈。',
      command: `agent-lynx get-console --level error,warning --limit 20 ${target}`,
      output: `[09:41:12.024Z] [error/background] [profile] Missing apiBaseUrl
    at https://example.com/profile-service.js:3:4`,
      result: '找到后台线程错误',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        '错误来自后台 VM 的 profile-service.js。接着读取实际加载的脚本，确认这条日志在什么条件下触发。',
    },
    {
      type: 'tool',
      id: 'debug-sources',
      name: 'agent-lynx get-sources',
      description:
        '列出后台 VM 已解析的脚本，匹配日志中的 URL；这里节选匹配到的脚本。',
      command: `agent-lynx get-sources ${target}`,
      output: JSON.stringify(
        [{ scriptId: '42', url: 'https://example.com/profile-service.js' }],
        null,
        2,
      ),
      result: '找到对应脚本',
    },
    {
      type: 'tool',
      id: 'debug-script-source',
      name: 'agent-lynx cdp --method Debugger.getScriptSource',
      description:
        '在同一个 session 和 VM 中使用上一步返回的脚本 ID，scriptSource 字段包含实际加载的 JavaScript。',
      command: `agent-lynx cdp --thread background --method Debugger.getScriptSource '{"scriptId":"42"}' ${target}`,
      output: JSON.stringify({ scriptSource: profileScript }, null, 2),
      result: '找到提前返回条件',
    },
    {
      type: 'note',
      content:
        '加载函数读取 lynx.__globalProps.apiBaseUrl，缺失时在请求前直接返回。接着在同一个后台 VM 中检查这个字段的实际值。',
    },
    {
      type: 'tool',
      id: 'debug-runtime-value',
      name: 'agent-lynx evaluate',
      description:
        '读取后台 VM 中宿主传入的当前字段值；这个表达式不会修改页面状态。',
      command: `agent-lynx evaluate 'lynx.__globalProps.apiBaseUrl' --thread background ${target}`,
      output: JSON.stringify({ result: { type: 'undefined' } }, null, 2),
      result: '运行时值为 undefined',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
