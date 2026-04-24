# Native API Desktop Documentation Cleanup Ledger

This document records Native API alignment issues between compat desktop support and MDX Desktop-specific documentation. Do not remove entries while cleaning; mark resolved entries in place so the cleanup history remains reviewable.

## Cleanup Rules

- Source code reference: `https://github.com/lynx-family/lynx/tree/develop/platform/embedder/public`.
- The source code reference is useful when verifying API ownership, but it is not the primary scan criterion for this ledger.
- Primary check: compat data says whether Desktop is supported; the corresponding MDX page should have Desktop-specific documentation when Desktop is supported.
- Scope is Native API only: `docs/{en,zh}/api/lynx-native-api` and `packages/lynx-compat-data/lynx-native-api`.
- Out of scope: `css/*`, `elements/*`, `lynx-api/*`, `lynx-devtool-native-api/*`, framework/tooling/testing/engine/error docs.
- Desktop compat platforms: `clay_macos` and `clay_windows`.
- Desktop support rule: `version_added` is not `false`, `null`, or absent for at least one desktop platform.
- Desktop MDX supplement rule: the corresponding MDX contains Desktop-specific content such as `### Desktop (C++)`, `<Tab label="Desktop C++">`, `Desktop-only`, or Desktop public API wording.
- When an item is cleaned, change the line from `- [ ] ...` to `- [x] ~~...~~` and append a short note if useful, for example `-- added Desktop section`, `-- corrected desktop support`, or `-- not Native API`.
- Keep the original scan entry text readable inside the strikethrough; do not delete completed entries.

## Case Examples

These examples show the shape of each cleanup case. The real cleanup checklist starts in the sections below.

### Compat Desktop Supported But MDX Desktop Docs Missing

Example item:

```md
- [ ] feature: `lynx-native-api.lynx-view.add-lynx-view-client` | compat: `packages/lynx-compat-data/lynx-native-api/lynx-view/add-lynx-view-client.json` | query: `lynx-native-api/lynx-view/add-lynx-view-client` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=no, zh=no | docs: docs/en/api/lynx-native-api/lynx-view/add-lynx-view-client.mdx, docs/zh/api/lynx-native-api/lynx-view/add-lynx-view-client.mdx | desc: register lifecycle observer for lynxView
```

Example after cleanup:

```md
- [x] ~~feature: `lynx-native-api.lynx-view.add-lynx-view-client` | compat: `packages/lynx-compat-data/lynx-native-api/lynx-view/add-lynx-view-client.json` | query: `lynx-native-api/lynx-view/add-lynx-view-client` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=no, zh=no | docs: docs/en/api/lynx-native-api/lynx-view/add-lynx-view-client.mdx, docs/zh/api/lynx-native-api/lynx-view/add-lynx-view-client.mdx | desc: register lifecycle observer for lynxView~~ -- added Desktop section
```

### Compat Desktop Supported But Only Some MDX Locales Have Desktop Docs

No items were found in this scan. If one appears in a later scan, it should look like this:

```md
- [ ] feature: `lynx-native-api.example` | compat: `packages/lynx-compat-data/lynx-native-api/example.json` | query: `lynx-native-api/example` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=yes, zh=no | docs: docs/en/api/lynx-native-api/example.mdx desktop_line=20, docs/zh/api/lynx-native-api/example.mdx
```

Example after cleanup:

```md
- [x] ~~feature: `lynx-native-api.example` | compat: `packages/lynx-compat-data/lynx-native-api/example.json` | query: `lynx-native-api/example` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=yes, zh=no | docs: docs/en/api/lynx-native-api/example.mdx desktop_line=20, docs/zh/api/lynx-native-api/example.mdx~~ -- added zh Desktop section
```

### MDX Desktop Docs Present But Compat Has No Desktop Support

No items were found in this scan. If one appears in a later scan, it should look like this:

```md
- [ ] feature: `lynx-native-api.example` | compat: `packages/lynx-compat-data/lynx-native-api/example.json` | query: `lynx-native-api/example` | desktop: clay_macos=false, clay_windows=false | mdx_desktop: en=yes, zh=yes | docs: docs/en/api/lynx-native-api/example.mdx desktop_line=30, docs/zh/api/lynx-native-api/example.mdx desktop_line=30
```

Example after cleanup:

```md
- [x] ~~feature: `lynx-native-api.example` | compat: `packages/lynx-compat-data/lynx-native-api/example.json` | query: `lynx-native-api/example` | desktop: clay_macos=false, clay_windows=false | mdx_desktop: en=yes, zh=yes | docs: docs/en/api/lynx-native-api/example.mdx desktop_line=30, docs/zh/api/lynx-native-api/example.mdx desktop_line=30~~ -- corrected desktop support or removed Desktop docs
```

### MDX Desktop Docs Present But Compat Desktop Support Is Partial

No items were found in this scan. If one appears in a later scan, it should look like this:

```md
- [ ] feature: `lynx-native-api.example` | compat: `packages/lynx-compat-data/lynx-native-api/example.json` | query: `lynx-native-api/example` | desktop: clay_macos=3.7, clay_windows=false | mdx_desktop: en=yes, zh=yes | docs: docs/en/api/lynx-native-api/example.mdx desktop_line=30, docs/zh/api/lynx-native-api/example.mdx desktop_line=30
```

Example after cleanup:

```md
- [x] ~~feature: `lynx-native-api.example` | compat: `packages/lynx-compat-data/lynx-native-api/example.json` | query: `lynx-native-api/example` | desktop: clay_macos=3.7, clay_windows=false | mdx_desktop: en=yes, zh=yes | docs: docs/en/api/lynx-native-api/example.mdx desktop_line=30, docs/zh/api/lynx-native-api/example.mdx desktop_line=30~~ -- corrected desktop platform support
```

## Scan Scope

- Scan report source: `/tmp/lynx-native-api-desktop-doc-alignment-report.json`
- Ledger generated at: `2026-04-21T06:09:35.488Z`
- Docs roots: `docs/en/api/lynx-native-api`, `docs/zh/api/lynx-native-api`
- Compat root: `packages/lynx-compat-data/lynx-native-api`
- Code source reference: `https://github.com/lynx-family/lynx/tree/develop/platform/embedder/public`
- Desktop platforms: `clay_macos`, `clay_windows`

## Scan Summary

| Metric | Count |
| --- | ---: |
| Unique Native API doc queries | 86 |
| Compat entries for doc queries | 86 |
| Missing compat entries | 0 |
| Compat desktop supported but no MDX Desktop docs | 5 |
| Compat desktop supported but some locale MDX lacks Desktop docs | 0 |
| MDX Desktop docs present but no compat desktop support | 0 |
| MDX Desktop docs present but compat desktop support is partial | 0 |
| Compat desktop supported and MDX has Desktop docs | 26 |

## Cleanup Verification

After applying the cleanup, the same Native API alignment scan reports:

| Metric | Count |
| --- | ---: |
| Compat desktop supported but no MDX Desktop docs | 0 |
| Compat desktop supported but some locale MDX lacks Desktop docs | 0 |
| MDX Desktop docs present but no compat desktop support | 0 |
| MDX Desktop docs present but compat desktop support is partial | 0 |

## Group Counts

### Compat Desktop Supported But No MDX Desktop Docs By Module

| Group | Count |
| --- | ---: |
| `lynx-native-api/lynx-view` | 4 |
| `lynx-native-api` | 1 |

### Compat Desktop Supported But Some Locale MDX Lacks Desktop Docs By Module

| Group | Count |
| --- | ---: |
| _none_ | 0 |

### MDX Desktop Docs Present But No Compat Desktop Support By Module

| Group | Count |
| --- | ---: |
| _none_ | 0 |

### MDX Desktop Docs Present But Partial Compat Desktop Support By Module

| Group | Count |
| --- | ---: |
| _none_ | 0 |

## Compat Desktop Supported But No MDX Desktop Docs

Native API items where at least one desktop platform is supported in compat data, but none of the corresponding MDX pages has a Desktop-specific documentation supplement.

- [x] ~~feature: `lynx-native-api.lynx-view.add-lynx-view-client` | compat: `packages/lynx-compat-data/lynx-native-api/lynx-view/add-lynx-view-client.json` | query: `lynx-native-api/lynx-view/add-lynx-view-client` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=no, zh=no | docs: docs/en/api/lynx-native-api/lynx-view/add-lynx-view-client.mdx, docs/zh/api/lynx-native-api/lynx-view/add-lynx-view-client.mdx | desc: register lifecycle observer for lynxView~~ -- added Desktop C++ section
- [x] ~~feature: `lynx-native-api.lynx-view.destroy` | compat: `packages/lynx-compat-data/lynx-native-api/lynx-view/destroy.json` | query: `lynx-native-api/lynx-view/destroy` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=no, zh=no | docs: docs/en/api/lynx-native-api/lynx-view/destroy.mdx, docs/zh/api/lynx-native-api/lynx-view/destroy.mdx | desc: manually destroy lynxView instance~~ -- documented Desktop C++ object destruction
- [x] ~~feature: `lynx-native-api.lynx-view.lynx-view-custom-element` | compat: `packages/lynx-compat-data/lynx-native-api/lynx-view/lynx-view-custom-element.json` | query: `lynx-native-api/lynx-view/lynx-view-custom-element` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=no, zh=missing-doc | docs: docs/en/api/lynx-native-api/lynx-view/lynx-view.mdx | desc: <code>lynx-view</code> The custom element of LynxView.~~ -- corrected desktop support; Web custom element is not public embedder Native API
- [x] ~~feature: `lynx-native-api.lynx-view.remove-lynx-view-client` | compat: `packages/lynx-compat-data/lynx-native-api/lynx-view/remove-lynx-view-client.json` | query: `lynx-native-api/lynx-view/remove-lynx-view-client` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=no, zh=no | docs: docs/en/api/lynx-native-api/lynx-view/remove-lynx-view-client.mdx, docs/zh/api/lynx-native-api/lynx-view/remove-lynx-view-client.mdx | desc: remove lifecycle observer of lynxView~~ -- added Desktop C++ section
- [x] ~~feature: `lynx-native-api.trace-event` | compat: `packages/lynx-compat-data/lynx-native-api/trace-event.json` | query: `lynx-native-api/trace-event` | desktop: clay_macos=3.7, clay_windows=3.7 | mdx_desktop: en=no, zh=no | docs: docs/en/api/lynx-native-api/trace-event.mdx, docs/zh/api/lynx-native-api/trace-event.mdx | desc: TraceEvent~~ -- added Desktop C API section

## Compat Desktop Supported But Some Locale MDX Lacks Desktop Docs

Native API items where desktop is supported in compat data, but only some existing locale docs have Desktop-specific content.

_No items found._

## MDX Desktop Docs Present But No Compat Desktop Support

Native API items where the MDX page has Desktop-specific documentation, but neither `clay_macos` nor `clay_windows` is supported in compat data.

_No items found._

## MDX Desktop Docs Present But Compat Desktop Support Is Partial

Native API items where the MDX page has Desktop-specific documentation, but only one of `clay_macos` or `clay_windows` is supported in compat data.

_No items found._
