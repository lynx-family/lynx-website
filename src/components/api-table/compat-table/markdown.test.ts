import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type * as LCD from '@lynx-js/lynx-compat-data';
import { renderCompatMarkdown } from './markdown';

const dataRoot = '../../../../packages/lynx-compat-data/';
const platforms: LCD.Platforms = JSON.parse(
  readFileSync(
    new URL(`${dataRoot}platforms/platforms.json`, import.meta.url),
    'utf8',
  ),
).platforms;
const sources: Record<string, LCD.Identifier> = JSON.parse(
  readFileSync(
    new URL(`${dataRoot}devtool/panels.json`, import.meta.url),
    'utf8',
  ),
).devtool.panels.sources;

test('exports breakpoint compatibility from its child features', () => {
  const input = sources.breakpoints;
  const output = renderCompatMarkdown(
    input,
    platforms,
    'devtool.panels.sources.breakpoints',
    'en',
  );
  assert.equal(
    output,
    `**Compatibility Table**
**Query:** \`devtool.panels.sources.breakpoints\`

**Feature:** \`BTS\`

**Platform Support**

| Platform | Version Added | Notes |
|----------|---------------|-------|
| Android | 3.0 | - |
| iOS | 3.0 | - |
| HarmonyOS | 3.0 | - |
| Web | ❌ No | - |

**Description:** Background thread breakpoints

**Feature:** \`MTS\`

**Platform Support**

| Platform | Version Added | Notes |
|----------|---------------|-------|
| Android | 3.0 | - |
| iOS | 3.0 | - |
| HarmonyOS | 3.5 | - |
| Web | ❌ No | - |

**Description:** Main thread breakpoints

`,
  );
});

test('exports JS engine compatibility from its child features', () => {
  const input = sources.JSEngine;
  const output = renderCompatMarkdown(
    input,
    platforms,
    'devtool.panels.sources.JSEngine',
    'en',
  );
  assert.equal(
    output,
    `**Compatibility Table**
**Query:** \`devtool.panels.sources.JSEngine\`

**Feature:** \`PrimJS\`

**Platform Support**

| Platform | Version Added | Notes |
|----------|---------------|-------|
| Android | 3.0 | - |
| iOS | 3.0 | - |
| HarmonyOS | 3.0 | - |
| Web | ❌ No | - |

**Description:** PrimJS

**Feature:** \`V8\`

**Platform Support**

| Platform | Version Added | Notes |
|----------|---------------|-------|
| Android | 3.0 | - |
| iOS | ❌ No | - |
| HarmonyOS | ❌ No | - |
| Web | ❌ No | - |

**Description:** V8

`,
  );
});

test('preserves leaf metadata and support statements', () => {
  const input: LCD.Identifier = {};
  input.__compat = {
    description: 'Example API',
    mdn_url: 'https://developer.mozilla.org/en-US/docs/Web/API/Example',
    spec_url: ['https://example.com/spec'],
    status: { experimental: true, deprecated: true },
    support: {
      android: [
        {
          version_added: '3.0',
          notes: ['First note', 'Second note'],
          prefix: 'test-',
          alternative_name: 'legacy',
          partial_implementation: true,
          flags: [{ type: 'preference', name: 'enabled' }],
        },
        { version_added: true },
      ],
      ios: { version_added: null },
      harmony: { version_added: false },
    },
  };
  const output = renderCompatMarkdown(input, platforms, 'example', 'zh');
  assert.equal(
    output,
    `**Compatibility Table**
**Query:** \`example\`

**Status:** 🧪 Experimental, ⚠️ Deprecated

**MDN Reference:** [https://developer.mozilla.org/zh-CN/docs/Web/API/Example](https://developer.mozilla.org/zh-CN/docs/Web/API/Example)

**Specifications:**
- [https://example.com/spec](https://example.com/spec)

**Platform Support**

| Platform | Version Added | Notes |
|----------|---------------|-------|
| Android | 3.0 | First note; Second note; Prefix: \`test-\`; Alternative name: \`legacy\`; Requires flags; ⚠️ Partial implementation |
| Android | ✅ Yes | - |
| iOS | ❓ Unknown | - |
| HarmonyOS | ❌ No | - |

**Description:** Example API

`,
  );
});

test('includes root and deeply nested features without losing their names', () => {
  const input: LCD.Identifier = {
    group: {
      nested: {
        __compat: { description: 'Child', support: {} },
      } as LCD.Identifier,
    },
  };
  input.__compat = { description: 'Root', support: {} };
  const output = renderCompatMarkdown(input, platforms, 'example', 'en');
  assert.equal(
    output,
    `**Compatibility Table**
**Query:** \`example\`

**Platform Support**

| Platform | Version Added | Notes |
|----------|---------------|-------|

**Description:** Root

**Feature:** \`group.nested\`

**Platform Support**

| Platform | Version Added | Notes |
|----------|---------------|-------|

**Description:** Child

`,
  );
});

test('keeps the error for a group with no compatibility records', () => {
  const input: LCD.Identifier = { group: {} };
  const output = renderCompatMarkdown(input, platforms, 'example', 'en');
  assert.equal(output, '**Error:** No compatibility data found for `example`');
});
