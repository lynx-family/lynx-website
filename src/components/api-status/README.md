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
│  api-stats.json ──▶ APIStatusDashboard.tsx                       │
│                          ├── CoverageCard.tsx                    │
│                          ├── CategoryTable.tsx                   │
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
package with `--root <compat-data-dir>` and `--output <file>`.

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

You can embed individual components in other pages:

```tsx
import { APIStatusDashboard } from '@site/src/components/api-status';

// Full dashboard
<APIStatusDashboard />;

// Or individual components
import { CoverageCard, CategoryTable } from '@site/src/components/api-status';
```

## Components

### APIStatusDashboard

The main dashboard component with:

- Hero section with overall statistics
- Tabbed interface (Overview, Categories, Recently Added)
- Platform coverage cards
- Category breakdown table

### CoverageCard

A card component showing platform-specific coverage:

- Platform icon and name
- Coverage percentage with progress bar
- Supported/total API count

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
