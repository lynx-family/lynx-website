# API Status Dashboard

A data-driven API compatibility tracking system for the Lynx documentation website.

## Overview

This system provides real-time visibility into Lynx API compatibility across all supported platforms (Android, iOS, HarmonyOS, Web, and the Clay sub-platforms). It consists of two main parts:

1. **Stats Generation Script** - A build-time script that walks through `@lynx-js/lynx-compat-data` and generates aggregated statistics
2. **Dashboard UI** - React components that visualize the statistics in an interactive dashboard

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Build Time                                │
├─────────────────────────────────────────────────────────────────┤
│  lynx-compat-data/                                               │
│  ├── elements/*.json         ─┐                                  │
│  ├── css/properties/*.json    │                                  │
│  ├── lynx-api/**/*.json       ├──▶ generate-stats.ts ──▶ api-stats.json
│  ├── lynx-native-api/**/*.json│                                  │
│  └── react/**/*.json         ─┘                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Runtime                                   │
├─────────────────────────────────────────────────────────────────┤
│  api-stats.json ──▶ APIStatusLayout.tsx                          │
│                          ├── pages/                             │
│                          ├── CategoryTable.tsx ──▶ APIItem.tsx   │
│                          └── types.ts                            │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Generating Statistics

Run the stats generation script from the workspace root:

```bash
pnpm gen:compat-stats
```

CI can generate statistics from another source tree or write them outside the
package with `--root <compat-data-dir>`, `--output <file>` and
`--docs-root <docs-dir>`.

This will:

1. Walk through all compatibility data directories
2. Count APIs and platform support
3. Generate the untracked `api-stats.json` in the lynx-compat-data package

Use this script rather than calling the package's `gen-stats` directly. It
passes this site's docs root, which is what lets the generator drop a `doc_url`
that would 404 instead of emitting it; without a docs root every URL is emitted
unchecked. See [`AGENTS.md`](../../../AGENTS.md#api-statsjson-doc-links).

### Viewing the Dashboard

The dashboard is available at:

- English: `/api/status`
- Chinese: `/zh/api/status`

### Embedding Components

Embed the dashboard through the public documentation entry:

```tsx
import { APIStatusLayout } from '@api-status';

// Full dashboard
<APIStatusLayout />;
```

## Components

### APIStatusLayout

The public dashboard entry with shared platform selection and navigation:

- `CoveragePage`: overall coverage and version trends
- `CategoriesPage`: category breakdowns
- `RecentPage`: recently added APIs
- `SearchPage`: filtered API search

### APIItem

The shared API button used by search, recent APIs, and expanded categories.
It shows selected-platform support and opens compatibility details in a drawer.

### CategoryTable

A table showing API coverage by category:

- Rows for each category (CSS, Elements, APIs, etc.)
- Columns for each platform
- Color-coded coverage percentages

## Data Structure

The generated `api-stats.json` has the following structure:

```typescript
interface APIStats {
  summary: {
    total_apis: number; // Total APIs tracked
    by_category: Record<string, CategoryStats>;
    by_platform: Record<PlatformName, PlatformStats>;
  };
  categories: Record<string, CategoryDetail>;
  recent_apis: RecentAPI[]; // APIs added in recent versions
}
```

## Customization

### Adding New Categories

Edit `packages/lynx-compat-data/scripts/generate-stats.ts`:

```typescript
const CATEGORIES = [
  { path: 'your-category', displayName: 'Your Category' },
  // ...
];
```

### Changing Tracked Platforms

Edit the `DISPLAY_PLATFORMS` array in `src/components/api-status/types.ts`:

```typescript
export const DISPLAY_PLATFORMS: PlatformName[] = [
  'android',
  'ios',
  'harmony',
  'web_lynx',
];
```

## Integration with CI/CD

The stats generation runs automatically during `pnpm install`, `pnpm dev`, and `pnpm build`. The generated `api-stats.json` is intentionally ignored by Git.

For compatibility-data pull requests, CI generates statistics from both the base and head source data, then posts their comparison as a pull request comment. The summary includes each Clay sub-platform so platform-specific changes remain visible.

If you need to regenerate stats manually:

```bash
pnpm gen:compat-stats
```

This ensures the dashboard always shows up-to-date statistics.
