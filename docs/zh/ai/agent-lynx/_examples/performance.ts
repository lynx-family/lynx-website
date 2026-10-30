import type { AgentConversationProps } from '@lynx/agent-conversation';

export const traceCaptureExample = {
  prompt:
    '帮我录一份 Settings 页面加载的性能 Trace，把内存数据也带上，并确认这份数据能用于分析。',
  steps: [
    {
      type: 'note',
      content: '先查找采集 skill，确认录制顺序和内存选项，再打开页面。',
    },
    {
      type: 'tool',
      id: 'trace-skills',
      name: 'agent-lynx skills list',
      description: '发现采集和分析 skill；这里只节选相关条目。',
      command: 'agent-lynx skills list',
      output: `<available_skills>
  <skill>
    <name>lynx-trace-analysis</name>
    <description>Specializes in analyzing Lynx trace data to diagnose performance issues and provide actionable optimization strategies.
Key Scenarios:
  - Loading Performance: Diagnosing slow startup metrics (FCP, FMP, TTI) and white screen issues.
  - Smoothness Analysis: Investigating root causes for scroll jank, frame drops, and interaction lag.
  - Regression Detection: Comparing traces to identify performance degradation or verify optimization gains between versions.
  - Pipeline Deep Dive: Pinpointing bottlenecks in specific rendering stages like Layout, Paint, JS execution, and background threads.
  - Native Module Analysis: Investigating performance issues related to native module calls.
  - Memory Analysis: Diagnosing high PSS, page lifecycle leaks, shared BTS context growth, VM pool waste, and JS heap snapshots.</description>
    <location>/tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-trace-analysis/SKILL.md</location>
  </skill>
  <skill>
    <name>lynx-trace-record</name>
    <description>This guide provides step-by-step instructions for recording Lynx performance traces. Use this guide when the user asks how to record a trace.</description>
    <location>/tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-trace-record/SKILL.md</location>
  </skill>
</available_skills>`,
      result: '找到采集与分析指南',
    },
    {
      type: 'tool',
      id: 'trace-skill',
      name: 'agent-lynx skills get lynx-trace-record',
      description:
        '节选先录制后打开页面的规则，以及内存与 GC 选项；执行入口使用当前 CLI 的 trace 命令。',
      command: 'agent-lynx skills get lynx-trace-record',
      output: `### Step 2. Start recording:
Execute the start command **BEFORE** building or opening the page on your device. This ensures you capture the entire first frame of the page. Use the \`--client\` parameter with the client ID from Step 1.

…

| Enable memory data collection | \`--enable-memory-trace\` | \`enableMemoryTrace\` | \`false\` |
| Disable automatic Garbage Collection | \`--no-force-gc\` | \`forceGC\` | \`true\` |

Skill directory: /tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-trace-record`,
      result: '确认采集顺序',
    },
    {
      type: 'tool',
      id: 'trace-start',
      name: 'agent-lynx trace start --enable-memory-trace',
      description:
        '在页面加载前开始采集，显式开启内存数据；自动 GC 保持默认开启。',
      command:
        'agent-lynx trace start --client "$CLIENT_ID" --enable-memory-trace',
      output: `{
  "success": true,
  "started": true,
  "restartRequired": false,
  "message": "Tracing started successfully. Open the target page and perform the actions to capture."
}`,
      result: '已开启内存采集',
      defaultOpen: true,
    },
    {
      type: 'tool',
      id: 'trace-open',
      name: 'agent-lynx open',
      description: '打开本地构建的 Settings bundle；从响应中提取页面列表。',
      command:
        "agent-lynx open 'http://127.0.0.1:33227/main.lynx.bundle?fullscreen=true' --client \"$CLIENT_ID\" | jq '.data.data'",
      output: `[
  {
    "session_id": 1,
    "type": "",
    "url": "http://127.0.0.1:33227/main.lynx.bundle?fullscreen=true"
  }
]`,
      result: '页面已打开',
    },
    {
      type: 'tool',
      id: 'trace-wait',
      name: 'agent-lynx wait --text Settings',
      description: '确认目标页面已经显示，再结束本次加载采集。',
      command:
        'agent-lynx wait --text Settings --client "$CLIENT_ID" --session 1',
      output:
        'Matched text "Settings" after 296ms. A fresh snapshot was cached.',
      result: '页面已显示',
    },
    {
      type: 'tool',
      id: 'trace-end',
      name: 'agent-lynx trace end',
      description:
        '使用同一 client 停止采集，保留下载句柄，并检查是否丢失数据。',
      command: 'agent-lynx trace end --client "$CLIENT_ID"',
      output: `{
  "success": true,
  "message": "Tracing completed successfully. Download the stream with \`agent-lynx trace read-data\`.",
  "stream": "1",
  "dataLossOccurred": false
}`,
      result: '未报告数据丢失',
    },
    {
      type: 'tool',
      id: 'trace-download',
      name: 'agent-lynx trace read-data',
      description:
        '把刚返回的 stream 1 保存到本地；下载完成后即可脱离设备分析。',
      command:
        'agent-lynx trace read-data --client "$CLIENT_ID" --stream 1 -o ./settings-memory.pftrace',
      output: `{
  "success": true,
  "message": "Trace data saved successfully.",
  "filePath": "/tmp/agent-lynx-perf-docs-20261030/settings-memory.pftrace",
  "bytesWritten": 154691
}`,
      result: '已保存 .pftrace',
    },
    {
      type: 'note',
      content:
        '文件已经下载。接下来检查能否解析，以及页面加载事件和内存开关是否真的写进了 Trace。',
    },
    {
      type: 'tool',
      id: 'trace-summary',
      name: 'agent-lynx trace event-summary',
      description: '解析本地文件；用 jq 隐去完整事件清单，保留计数和文件标识。',
      command:
        "agent-lynx trace event-summary ./settings-memory.pftrace --json | jq 'del(.events)'",
      output: `{
  "success": true,
  "parseSucceeded": true,
  "trace": {
    "path": "/tmp/agent-lynx-perf-docs-20261030/settings-memory.pftrace",
    "bytes": 154691,
    "sha256": "383b14aaf6e08522eb13969c859a6154c2e0fbebcafeaeca5d6247523edee2e7"
  },
  "eventSource": "slice.name",
  "totalEvents": 8257,
  "uniqueEventNames": 889
}`,
      result: '8,257 条事件',
    },
    {
      type: 'tool',
      id: 'trace-proof',
      name: 'agent-lynx trace query',
      description:
        '核对加载、DOM 就绪事件，以及 TRACE_BEGIN 中实际记录的内存和 GC 配置。 用 jq 将校验结果显示为紧凑文本。',
      command:
        "agent-lynx trace query ./settings-memory.pftrace --sql \"SELECT name AS evidence, CAST(COUNT(*) AS TEXT) AS value FROM slice WHERE name IN ('LynxLoadTemplate', 'LynxDomReady') GROUP BY name UNION ALL SELECT a.key, a.display_value FROM slice s JOIN args a ON a.arg_set_id = s.arg_set_id WHERE s.name = 'TRACE_BEGIN'\" | jq -r '\"parseSucceeded: \\(.parseSucceeded), truncated: \\(.truncated)\", (.rows[] | \"\\(.evidence): \\(.value)\")'",
      output: `parseSucceeded: true, truncated: false
LynxDomReady: 1
LynxLoadTemplate: 1
debug.enable_memory_trace: 1
debug.memory_trace_force_gc: 1`,
      result: '加载与内存配置已核对',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const traceMemoryExample = {
  prompt:
    '用这份 Trace 看一下 Settings 页面加载期间的内存情况，给我一份能继续查看的报告。',
  steps: [
    {
      type: 'note',
      content:
        '已有可解析的 Trace，直接加载分析 skill，并选择它的内存分析指南。',
    },
    {
      type: 'tool',
      id: 'memory-analysis-skill',
      name: 'agent-lynx skills get lynx-trace-analysis',
      description: '节选分析指南目录；根据问题选择 memory-analysis。',
      command: 'agent-lynx skills get lynx-trace-analysis',
      output: `### KNOWLEDGE BASE

*These are the "Guidebooks" you must load to know **what** to query.*
- [metrics-analysis](./references/metrics-analysis.md): Guide for: Startup phases, FCP/TTI, Navigation timing, White screen causes.
- [timing-flag](./references/timing-flag.md): Guide for Diagnosing missing performance callbacks, invalid timing flags, and abnormal ActualFMP/FMP durations.
- [jank-analysis](./references/jank-analysis.md): Guide for: Scroll smoothness, Input latency, Long Tasks (>16ms), Frame drops.
- [diff-analysis](./references/diff-analysis.md): Guide for: Comparing two traces, identifying regressions in specific phases.
- [nativemodule-analysis](./references/nativemodule-analysis.md): Guide for: Bridge communication, Native method latency, Serialization costs.
- [render-pipeline](./references/render-pipeline.md): Guide for: Understanding Lynx rendering pipeline, identifying slow stages, and analyzing gaps between metrics.
- [event-analysis](./references/event-analysis.md): Guide for: Diagnosing missing touch/custom/global events, tracing event dispatch to the real business handler, and distinguishing event delivery delay from handler cost.
- [memory-analysis](./references/memory-analysis.md): Guide for: High memory, page load/exit memory changes, memory leaks, shared BTS contexts, scrolling trends, VM pools, and JS heap snapshots.
- [sql-guide](./references/sql-guide.md): Guide for writing raw SQL queries to query trace data.
- [sourcemap-remapping](./references/sourcemap-remapping.md): Guide for remapping line and column numbers from Lynx trace event arguments back to original source positions.

…

Skill directory: /tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-trace-analysis`,
      result: '选择内存分析指南',
    },
    {
      type: 'tool',
      id: 'memory-analysis-read',
      name: 'Read · references/memory-analysis.md',
      description:
        '读取 skill 返回目录中的内存指南；这里节选分析入口和报告命令。',
      command: 'Read $TRACE_SKILL_DIR/references/memory-analysis.md',
      output: `## First Action

Classify the request, then perform exactly one first action:

| Request | First action |
|---|---|
| Broad memory analysis, high memory, leak check, page load/exit memory | Run \`memory-analysis\` with the trace path |
| Specific page URL | Run \`memory-analysis --url "<substring>"\` |
| Specific \`instance_id\` | Run \`memory-analysis --instance-id <id>\` |
| Scrolling/sliding trend | Ensure page URL or \`instance_id\` and an absolute trace time range are known, then run \`memory-analysis --scenario scroll --start <ms> --end <ms>\` |
| Specific VM snapshot numbers | Run \`memory-analysis\` first to obtain the VM's 1-based snapshot list |

Do not ask follow-up questions for a broad memory request. The default analysis covers every page created
after trace recording starts.

## Main Analysis Command

\`\`\`bash
node <path_to_the_skill>/scripts/trace_query.bundle.cjs memory-analysis \\
  --path "<trace_path_or_url>" \\
  --output "<report_path>.html"
\`\`\``,
      result: '按页面选择分析范围',
      kind: 'read',
    },
    {
      type: 'tool',
      id: 'memory-analysis-report',
      name: 'node · trace_query.bundle.cjs memory-analysis',
      description:
        'TRACE_SKILL_DIR 是 skills get 返回的目录。按 bundle URL 选择页面，生成 HTML 报告；这里节选报告路径、摘要和警告。',
      command:
        'node "$TRACE_SKILL_DIR/scripts/trace_query.bundle.cjs" memory-analysis --path ./settings-memory.pftrace --url main.lynx.bundle --output ./settings-memory-report.html',
      output: `Memory analysis: {
  "valid": true,
  "reportPath": "/tmp/agent-lynx-perf-docs-20261030/settings-memory-report.html",
  "summary": {
    "analyzedPageCount": 1,
    "issueCount": 0,
    "conclusion": "未发现规则命中的高或中置信度内存问题，请结合 HTML 报告检查完整数据。"
  },
  "warnings": []
}
…`,
      result: '报告已生成',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const liveMemoryExample = {
  prompt:
    '现在 Settings 页面主要占用哪些内存？把后台和主线程的 JS 堆快照也保存下来，留作后续检查。',
  steps: [
    {
      type: 'note',
      content:
        '先读取全局内存，区分运行时、元素和视图占用，再保存两个 VM 的对象快照。',
    },
    {
      type: 'tool',
      id: 'memory-skill',
      name: 'agent-lynx skills get lynx-devtool',
      description:
        '节选全局内存与 JS 堆快照操作；全局统计和页面 VM 使用不同的 session 范围。',
      command: 'agent-lynx skills get lynx-devtool',
      output: `#### 15. Take Heap Snapshot

Capture a QuickJS heap snapshot from the current Lynx session and save it as a \`.heapsnapshot\` file.

\`\`\`bash
agent-lynx take-heap-snapshot [options]
\`\`\`

- \`-c, --client <clientId>\`: (Optional) Client ID.
- \`-s, --session <sessionId>\`: (Optional) Session ID.
- \`--thread <thread>\`: (Optional) Target VM thread, \`background\` or \`main\`. Defaults to \`background\`.
- \`-o, --output <path>\`: (Optional) Output file path. Defaults to the OS temp directory.

#### 16. Query Global Memory Usage

Query Lynx global memory usage through the global \`Memory.*\` CDP domain. Use the generic \`cdp\` command and send the request to the global DevTool handler with session ID \`-1\`.

\`\`\`bash
# Get global Lynx memory usage across live instances
agent-lynx cdp -s -1 -m Memory.getAllMemoryUsage
agent-lynx cdp -s -1 -m Memory.getAllMemoryUsage '{"timeoutMs":50000}'
\`\`\`

- \`-c, --client <clientId>\`: (Optional) Client ID.
- \`-s, --session <sessionId>\`: CDP session ID. Use \`-1\` for the global DevTool handler unless you have a platform-specific reason to override it.
- \`params.timeoutMs\` (Optional): Non-negative timeout in milliseconds. Maximum value is \`300000\`.

The command prints the raw \`Memory.getAllMemoryUsage\` JSON. Do not expect the CLI output to contain derived \`summary\`, \`topMemoryItems\`, or \`topInstances\` wrapper fields.

When the DevTool MCP server is available, prefer the \`Memory_getAllMemoryUsage\` MCP tool for the same raw payload instead of shelling out to the CLI.

…

Skill directory: /tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-devtool`,
      result: '确认查询范围',
    },
    {
      type: 'tool',
      id: 'memory-reference',
      name: 'Read · Memory.getAllMemoryUsage.md',
      description:
        '读取支持的 CDP 方法说明，确认全局 session -1 和 timeoutMs 参数。',
      command:
        'Read $DEVTOOL_SKILL_DIR/references/cdp/memory/Memory.getAllMemoryUsage.md',
      output: `# Memory.getAllMemoryUsage

Scope: This is a Lynx global CDP extension. Send it to the global DevTool handler with session ID \`-1\` unless you have a platform-specific reason to override the session.

- \`Memory.getAllMemoryUsage\` - Get global Lynx memory usage across live registered Lynx instances.
- Input:
  - \`timeoutMs\` (integer, optional): Non-negative timeout in milliseconds. \`0\` or omission lets the platform choose its default wait policy. Maximum accepted value is \`300000\`; fractional values are rejected.`,
      result: '全局 session -1',
      kind: 'read',
    },
    {
      type: 'tool',
      id: 'memory-global',
      name: 'agent-lynx cdp --method Memory.getAllMemoryUsage',
      description:
        '查询整个应用中已注册的 Lynx 实例；jq 节选全局总量与内存构成，并保留采集完成状态。',
      command:
        'agent-lynx cdp --client "$CLIENT_ID" --session -1 --method Memory.getAllMemoryUsage \'{"timeoutMs":50000}\' | jq \'{collectionStatus, completedInstanceCount, expectedInstanceCount, totalBytes, appBytes, ratioToApp, elementNodeCount, elementBytes, viewBytes, mainThreadRuntimeBytes, backgroundThreadRuntimeBytes}\'',
      output: `{
  "collectionStatus": "completed",
  "completedInstanceCount": 1,
  "expectedInstanceCount": 1,
  "totalBytes": 8229400,
  "appBytes": 128318464,
  "ratioToApp": 0.06413262552768711,
  "elementNodeCount": 81,
  "elementBytes": 86832,
  "viewBytes": 0,
  "mainThreadRuntimeBytes": 599976,
  "backgroundThreadRuntimeBytes": 7542592
}`,
      result: '1/1 实例，7.85 MiB',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        '这次返回的主要占用是后台运行时。接下来的堆快照切回 Settings 页面的 session 2，分别采集两个线程。',
    },
    {
      type: 'tool',
      id: 'heap-background',
      name: 'agent-lynx take-heap-snapshot --thread background',
      description: '保存后台 VM 的 JS 对象图，供后续检查对象类型和引用链。',
      command:
        'agent-lynx take-heap-snapshot --client "$CLIENT_ID" --session 2 --thread background -o ./settings-background.heapsnapshot',
      output: 'Heap snapshot saved to ./settings-background.heapsnapshot',
      result: '后台堆快照已保存',
    },
    {
      type: 'tool',
      id: 'heap-main',
      name: 'agent-lynx take-heap-snapshot --thread main',
      description: '另存主线程 VM 快照；两个文件对应同一页面的不同运行时。',
      command:
        'agent-lynx take-heap-snapshot --client "$CLIENT_ID" --session 2 --thread main -o ./settings-main.heapsnapshot',
      output: 'Heap snapshot saved to ./settings-main.heapsnapshot',
      result: '主线程堆快照已保存',
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
