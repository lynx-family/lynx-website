import type { AgentConversationProps } from '@lynx/agent-conversation';

export const traceCaptureExample = {
  prompt:
    'Record the Settings page loading, include memory data, and check that the trace is usable for analysis.',
  steps: [
    {
      type: 'note',
      content:
        'I will read the capture skill to choose the recording order and memory options before opening the page.',
    },
    {
      type: 'tool',
      id: 'trace-skills',
      name: 'agent-lynx skills list',
      description:
        'Discover the capture and analysis skills; relevant entries are excerpted here.',
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
      result: 'Capture and analysis guides found',
    },
    {
      type: 'tool',
      id: 'trace-skill',
      name: 'agent-lynx skills get lynx-trace-record',
      description:
        'Excerpt the start-before-open rule and memory/GC options; use the current CLI trace commands to execute them.',
      command: 'agent-lynx skills get lynx-trace-record',
      output: `### Step 2. Start recording:
Execute the start command **BEFORE** building or opening the page on your device. This ensures you capture the entire first frame of the page. Use the \`--client\` parameter with the client ID from Step 1.

…

| Enable memory data collection | \`--enable-memory-trace\` | \`enableMemoryTrace\` | \`false\` |
| Disable automatic Garbage Collection | \`--no-force-gc\` | \`forceGC\` | \`true\` |

Skill directory: /tmp/agent-lynx-perf-docs-20261030/node_modules/@lynx-js/skill-lynx-trace-record`,
      result: 'Capture order established',
    },
    {
      type: 'tool',
      id: 'trace-start',
      name: 'agent-lynx trace start --enable-memory-trace',
      description:
        'Start before loading the page, explicitly enable memory data, and keep automatic GC enabled by default.',
      command:
        'agent-lynx trace start --client "$CLIENT_ID" --enable-memory-trace',
      output: `{
  "success": true,
  "started": true,
  "restartRequired": false,
  "message": "Tracing started successfully. Open the target page and perform the actions to capture."
}`,
      result: 'Memory capture requested',
      defaultOpen: true,
    },
    {
      type: 'tool',
      id: 'trace-open',
      name: 'agent-lynx open',
      description:
        'Open the locally built Settings bundle and extract the page list from the response.',
      command:
        "agent-lynx open 'http://127.0.0.1:33227/main.lynx.bundle?fullscreen=true' --client \"$CLIENT_ID\" | jq '.data.data'",
      output: `[
  {
    "session_id": 1,
    "type": "",
    "url": "http://127.0.0.1:33227/main.lynx.bundle?fullscreen=true"
  }
]`,
      result: 'Page opened',
    },
    {
      type: 'tool',
      id: 'trace-wait',
      name: 'agent-lynx wait --text Settings',
      description:
        'Confirm the target page has appeared before ending the loading capture.',
      command:
        'agent-lynx wait --text Settings --client "$CLIENT_ID" --session 1',
      output:
        'Matched text "Settings" after 296ms. A fresh snapshot was cached.',
      result: 'Page visible',
    },
    {
      type: 'tool',
      id: 'trace-end',
      name: 'agent-lynx trace end',
      description:
        'Stop on the same client, retain the stream handle, and check for data loss.',
      command: 'agent-lynx trace end --client "$CLIENT_ID"',
      output: `{
  "success": true,
  "message": "Tracing completed successfully. Download the stream with \`agent-lynx trace read-data\`.",
  "stream": "1",
  "dataLossOccurred": false
}`,
      result: 'No data loss reported',
    },
    {
      type: 'tool',
      id: 'trace-download',
      name: 'agent-lynx trace read-data',
      description:
        'Save the returned stream 1 locally; analysis can continue without the device after downloading.',
      command:
        'agent-lynx trace read-data --client "$CLIENT_ID" --stream 1 -o ./settings-memory.pftrace',
      output: `{
  "success": true,
  "message": "Trace data saved successfully.",
  "filePath": "/tmp/agent-lynx-perf-docs-20261030/settings-memory.pftrace",
  "bytesWritten": 154691
}`,
      result: 'Trace saved',
    },
    {
      type: 'note',
      content:
        'The file is downloaded. I will check parsing, page-load events, and whether the trace actually recorded the memory settings.',
    },
    {
      type: 'tool',
      id: 'trace-summary',
      name: 'agent-lynx trace event-summary',
      description:
        'Parse the local file; jq omits the full event inventory while retaining counts and file identity.',
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
      result: '8,257 events',
    },
    {
      type: 'tool',
      id: 'trace-proof',
      name: 'agent-lynx trace query',
      description:
        'Check load/DOM-ready events and the memory/GC configuration actually recorded in TRACE_BEGIN. jq formats the validation as compact text.',
      command:
        "agent-lynx trace query ./settings-memory.pftrace --sql \"SELECT name AS evidence, CAST(COUNT(*) AS TEXT) AS value FROM slice WHERE name IN ('LynxLoadTemplate', 'LynxDomReady') GROUP BY name UNION ALL SELECT a.key, a.display_value FROM slice s JOIN args a ON a.arg_set_id = s.arg_set_id WHERE s.name = 'TRACE_BEGIN'\" | jq -r '\"parseSucceeded: \\(.parseSucceeded), truncated: \\(.truncated)\", (.rows[] | \"\\(.evidence): \\(.value)\")'",
      output: `parseSucceeded: true, truncated: false
LynxDomReady: 1
LynxLoadTemplate: 1
debug.enable_memory_trace: 1
debug.memory_trace_force_gc: 1`,
      result: 'Load and memory settings verified',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const traceMemoryExample = {
  prompt:
    'Use that trace to inspect memory during the Settings page load and produce a report I can explore.',
  steps: [
    {
      type: 'note',
      content:
        'The trace is already validated. I will load the analysis skill and follow its memory guide.',
    },
    {
      type: 'tool',
      id: 'memory-analysis-skill',
      name: 'agent-lynx skills get lynx-trace-analysis',
      description:
        'Excerpt the analysis guide index and select memory-analysis for this question.',
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
      result: 'Memory guide selected',
    },
    {
      type: 'tool',
      id: 'memory-analysis-read',
      name: 'Read · references/memory-analysis.md',
      description:
        'Read the memory guide from the returned skill directory; the entry workflow and report command are excerpted.',
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
      result: 'Page scope established',
      kind: 'read',
    },
    {
      type: 'tool',
      id: 'memory-analysis-report',
      name: 'node · trace_query.bundle.cjs memory-analysis',
      description:
        'TRACE_SKILL_DIR is the directory returned by skills get. Select the page by bundle URL and generate HTML; report path, summary, and warnings are excerpted.',
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
      result: 'Report generated',
      defaultOpen: true,
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;

export const liveMemoryExample = {
  prompt:
    'What accounts for the Settings page’s current memory use? Save background- and main-thread JS heap snapshots for follow-up inspection.',
  steps: [
    {
      type: 'note',
      content:
        'I will read global memory to separate runtime, element, and view usage, then save the object snapshots for both VMs.',
    },
    {
      type: 'tool',
      id: 'memory-skill',
      name: 'agent-lynx skills get lynx-devtool',
      description:
        'Excerpt global-memory and heap-snapshot instructions; global statistics and page VMs use different session scopes.',
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
      result: 'Scopes established',
    },
    {
      type: 'tool',
      id: 'memory-reference',
      name: 'Read · Memory.getAllMemoryUsage.md',
      description:
        'Read the supported CDP method reference to confirm global session -1 and timeoutMs.',
      command:
        'Read $DEVTOOL_SKILL_DIR/references/cdp/memory/Memory.getAllMemoryUsage.md',
      output: `# Memory.getAllMemoryUsage

Scope: This is a Lynx global CDP extension. Send it to the global DevTool handler with session ID \`-1\` unless you have a platform-specific reason to override the session.

- \`Memory.getAllMemoryUsage\` - Get global Lynx memory usage across live registered Lynx instances.
- Input:
  - \`timeoutMs\` (integer, optional): Non-negative timeout in milliseconds. \`0\` or omission lets the platform choose its default wait policy. Maximum accepted value is \`300000\`; fractional values are rejected.`,
      result: 'Global session -1',
      kind: 'read',
    },
    {
      type: 'tool',
      id: 'memory-global',
      name: 'agent-lynx cdp --method Memory.getAllMemoryUsage',
      description:
        'Query registered Lynx instances across the app; jq selects global totals and memory categories, preserving collection status.',
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
      result: '1/1 instances, 7.85 MiB',
      defaultOpen: true,
    },
    {
      type: 'note',
      content:
        'The background runtime is the largest reported contributor. I will switch to the Settings page’s session 2 and capture each VM separately.',
    },
    {
      type: 'tool',
      id: 'heap-background',
      name: 'agent-lynx take-heap-snapshot --thread background',
      description:
        'Save the background VM’s JS object graph for later object-type and retainer inspection.',
      command:
        'agent-lynx take-heap-snapshot --client "$CLIENT_ID" --session 2 --thread background -o ./settings-background.heapsnapshot',
      output: 'Heap snapshot saved to ./settings-background.heapsnapshot',
      result: 'Background heap saved',
    },
    {
      type: 'tool',
      id: 'heap-main',
      name: 'agent-lynx take-heap-snapshot --thread main',
      description:
        'Save the main-thread VM separately; the two files represent different runtimes for the same page.',
      command:
        'agent-lynx take-heap-snapshot --client "$CLIENT_ID" --session 2 --thread main -o ./settings-main.heapsnapshot',
      output: 'Heap snapshot saved to ./settings-main.heapsnapshot',
      result: 'Main-thread heap saved',
    },
  ],
} satisfies Pick<AgentConversationProps, 'prompt' | 'steps'>;
