---
name: doc-description-governance
description: "Audit and optimize frontmatter `description` fields across documentation pages to keep them concise and token-efficient. Use this skill when the user wants to add missing descriptions, trim verbose ones, enforce a token budget on page descriptions, or ensure every doc page has a proper frontmatter description. Also trigger when the user mentions 'description is too long', 'add description frontmatter', 'optimize page descriptions', 'llms.txt is too big', or 'descriptions are eating too many tokens'."
---

# Documentation Page Description Governance

This skill helps you audit and optimize frontmatter `description` fields across documentation pages. Well-governed descriptions keep generated outputs (like `llms.txt`) compact and meaningful, and also improve SEO and link previews.

## Why This Matters

Pages without explicit `description` frontmatter fall back to their first paragraph — often hundreds of tokens of prose, unresolved MDX variables, JSX tags, or import statements. This bloats any consumer of the description (llms.txt, meta tags, link previews). The goal is to ensure every page has a deliberate, concise description that stays within a token budget (typically 30 tokens as measured by tiktoken gpt-4o).

## Workflow

### 1. Audit Current State

Use the built `llms.txt` as a detection surface — it exposes every page's effective description in one file. Identify entries exceeding the token budget:

```typescript
import { encodingForModel } from 'js-tiktoken';
import fs from 'node:fs/promises';

const enc = encodingForModel('gpt-4o');
const TOKEN_LIMIT = 30;

const llmsTxt = await fs.readFile('doc_build/llms.txt', 'utf-8');
const appendixStart = llmsTxt.indexOf('## 98. Appendix: Links');
const appendixContent = llmsTxt.slice(appendixStart);
const lines = appendixContent.split('\n').filter((l) => l.startsWith('* ['));

for (const line of lines) {
  const match = line.match(/^\* \[([^\]]*)\]\(([^)]+)\): (.+)$/);
  if (!match) continue;
  const [, title, url, desc] = match;
  const tokens = enc.encode(desc).length;
  if (tokens > TOKEN_LIMIT) {
    console.log(`${tokens} tokens: ${url} | ${desc.slice(0, 80)}`);
  }
}
```

Count tokens with tiktoken, not word count. Word-splitting (`split(/\s+/)`) severely undercounts Chinese/Japanese text where each character is 1-2 tokens.

### 2. Classify Each Overlong Entry

For each entry exceeding the budget, determine the fix strategy:

| Situation                                                          | Fix                                                       |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| File has no frontmatter description                                | Add `description` field to frontmatter                    |
| File already has a frontmatter description that's too long         | Do NOT modify the source — rely on postprocess truncation |
| Description contains unresolved MDX variables (`{someVar['key']}`) | Add a proper `description` frontmatter to override        |
| Description contains JSX/import leakage                            | Add a proper `description` frontmatter to override        |

The key rule: **never modify an existing `description` that was already in the file**. Someone wrote it deliberately. Instead, rely on the build-time truncation safety net to clip it at output time.

### 3. Add Frontmatter Descriptions

For files that need a new description:

```yaml
---
description: "Concise summary of the page's purpose."
---
```

Guidelines for writing descriptions:

- Must be under 30 tokens (measured by tiktoken gpt-4o); aim for 15-25 tokens
- Focus on what the page helps the reader DO, not what it IS
- No marketing language, no "this page explains..."
- Place `description` as the first field if adding to existing frontmatter
- Insert before any import statements if adding new frontmatter block

### 4. Build-Time Truncation (Safety Net)

Add a postprocess step that automatically truncates any description exceeding the token budget. This catches entries from files with long pre-existing descriptions without modifying source files.

```typescript
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');

function truncateLongDescriptions(markdown: string, maxTokens: number): string {
  const ellipsis = '…';
  const ellipsisTokens = enc.encode(ellipsis).length;
  return markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\* \[[^\]]*\]\([^)]+\)): (.+)$/);
      if (!match) return line;
      const [, prefix, desc] = match;
      const tokens = enc.encode(desc);
      if (tokens.length <= maxTokens) return line;
      const truncated = enc.decode(tokens.slice(0, maxTokens - ellipsisTokens));
      return `${prefix}: ${truncated}${ellipsis}`;
    })
    .join('\n');
}
```

The ellipsis itself costs tokens — always subtract its token count from the budget before slicing.

### 5. Verification

After building, verify all language variants pass:

```bash
node --experimental-transform-types -e "
import { encodingForModel } from 'js-tiktoken';
import fs from 'node:fs/promises';
const enc = encodingForModel('gpt-4o');
const TOKEN_LIMIT = 30;
for (const file of ['doc_build/llms.txt', 'doc_build/zh/llms.txt']) {
  const llms = await fs.readFile(file, 'utf-8');
  const start = llms.indexOf('## 98. Appendix: Links');
  const lines = llms.slice(start).split('\n').filter(l => l.startsWith('* ['));
  let exceeding = 0;
  for (const line of lines) {
    const match = line.match(/^\* \[([^\]]*]\)\(([^)]+\)): (.+)$/);
    if (!match) continue;
    if (enc.encode(match[3]).length > TOKEN_LIMIT) exceeding++;
  }
  console.log(file + ': ' + exceeding + ' exceeding');
}
"
```

## Common Pitfalls

- **Chinese token counting**: A single Chinese character can be 1-3 tokens in tiktoken. Never estimate Chinese text by character count alone.
- **Shared pages**: Documentation frameworks often mount the same MDX at multiple routes (e.g., `/react/start/X`, `/rspeedy/start/X`). Adding frontmatter to the source fixes all routes at once.
- **MDX variable leakage**: Pages using `{someVar['key']}` in their first paragraph will have that raw expression appear in llms.txt because the llms.txt generator doesn't execute JS. Adding a proper `description` frontmatter overrides this.
- **Ellipsis token cost**: `…` (U+2026) is 1 token in gpt-4o. `...` (three dots) is also 1 token. Account for it when truncating.

## Dependencies

- `js-tiktoken` — for accurate token counting (install with `pnpm add -D js-tiktoken`)
- A documentation framework with `llms.txt` generation (rspress with `llms: true`, or similar)
