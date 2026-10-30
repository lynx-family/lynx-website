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
  prompt:
    'I tapped Load Profile, but no user details appeared. Can you find out why?',
  steps: [
    {
      type: 'note',
      content:
        'I will read this page’s error and warning logs to identify the VM thread and script involved.',
    },
    {
      type: 'tool',
      id: 'debug-console',
      name: 'agent-lynx get-console',
      description:
        'Read errors and warnings from the selected page. The log includes its VM thread and available stack trace.',
      command: `agent-lynx get-console --level error,warning --limit 20 ${target}`,
      output: `[09:41:12.024Z] [error/background] [profile] Missing apiBaseUrl
    at https://example.com/profile-service.js:3:4`,
      result: 'Background error located',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        'The error comes from profile-service.js in the background VM. I will inspect the loaded script to see what triggers it.',
    },
    {
      type: 'tool',
      id: 'debug-sources',
      name: 'agent-lynx get-sources',
      description:
        'List parsed scripts from the background VM and match the URL in the log. This excerpt shows the matching script.',
      command: `agent-lynx get-sources ${target}`,
      output: JSON.stringify(
        [{ scriptId: '42', url: 'https://example.com/profile-service.js' }],
        null,
        2,
      ),
      result: 'Matching script found',
    },
    {
      type: 'tool',
      id: 'debug-script-source',
      name: 'agent-lynx cdp --method Debugger.getScriptSource',
      description:
        'Use the returned script ID on the same session and VM. The scriptSource field contains the loaded JavaScript.',
      command: `agent-lynx cdp --thread background --method Debugger.getScriptSource '{"scriptId":"42"}' ${target}`,
      output: JSON.stringify({ scriptSource: profileScript }, null, 2),
      result: 'Early return found',
    },
    {
      type: 'note',
      content:
        'The function reads apiBaseUrl from lynx.__globalProps and returns before fetching if it is missing. I will check that field in the same background VM.',
    },
    {
      type: 'tool',
      id: 'debug-runtime-value',
      name: 'agent-lynx evaluate',
      description:
        'Read the current host-provided field in the background VM. This expression does not change the page state.',
      command: `agent-lynx evaluate 'lynx.__globalProps.apiBaseUrl' --thread background ${target}`,
      output: JSON.stringify({ result: { type: 'undefined' } }, null, 2),
      result: 'Runtime value is undefined',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
