# Understanding the Alias Contract

An alias preserves an import's meaning when OSS source is mounted in another
repository. The registry describes that policy; each site's resolver supplies
physical paths. OSS documents and components normally move together at one
pin, so current direct imports do not automatically become independently
versioned Component APIs.

The [README](./README.md) covers changes and CLI usage.
[`types.ts`](./types.ts) documents fields; [`registry.ts`](./registry.ts) is
the current alias map. This guide explains how those fields work together.

## Three Ownership Questions

| Question                                   | Policy                                        |
| ------------------------------------------ | --------------------------------------------- |
| Who governs the namespace?                 | `owner`                                       |
| Whose source may import it?                | `allowedImporters` and `visibility`           |
| Who may provide the first resolved target? | `bareTargetOwners` or `subpaths.targetOwners` |

Owners are logical identities, not checkout directories. Moving OSS code
downstream preserves `lynx-website` ownership. A downstream-authored wrapper
is `consumer`-owned even when it re-exports OSS code. Synchronized `lynx-ui`
documents retain their producer owner; the website maintains the components
they consume through `@lynx-ui`.

`implementationSources` adds the source-area boundary: a target must come
from a required area or an additionally permitted owner, **and** satisfy the
target-owner policy for its import form.

## Shared Policy and Local Namespaces

An assembled site contains source from different logical owners. Sharing a
resolver root does not make that source one owner. `owner-private` means
both the importing source and the first resolved target belong to the alias
owner; it does not mean "anything in this checkout".

Consumers may add their own private aliases through `aliasExtensions`:

```text
OSS source      -> @/*        -> OSS implementation
allowed owners  -> @lynx      -> public barrel (including permitted wrappers)
consumer source -> @local/*   -> declared consumer implementation areas
```

The shared registry remains authoritative for shared contracts. Local
extensions use the same schema and enter the same validation pass, with stricter
consumer-only ownership and explicit source-area bounds. They cannot replace a
shared record or overlap its accepted specifiers. A future shared alias that
collides with an extension fails validation instead of silently changing imports.

This separates two kinds of extension: adding exports to a shared public
barrel (`mayExtendBare`), and declaring a private namespace for local source
(`aliasExtensions`). Ordered resolver roots affect lookup order, not either
permission. Consumer-generated code must use its local namespace for local
dependencies; shared APIs still use their public aliases.

## Bare Wrapper and Direct Subpath

`@lynx` and `@lynx-ui` permit these two bindings:

```text
bare import -> consumer wrapper -> complete OSS barrel
                         + unique consumer exports

direct import -> OSS component file
```

`mayExtendBare` allows the first binding. A required OSS component area
remains in the source map, while an additional consumer area hosts the
wrapper. Re-exports do not change the wrapper's owner.

Direct component paths remain OSS-owned migration inventory. Extending a
bare barrel does not authorize consumer files to shadow direct imports.
Preserving exports and rejecting collisions requires Gate 2's barrel
traversal; Gate 1 only checks that the policy can represent the wrapper.

## Framework Fallback

Rspress governs `@theme`. Its custom theme may be website- or consumer-owned;
the default theme remains Rspress-owned:

```text
@theme        -> active site's custom theme entry
@theme/path   -> custom theme first -> Rspress default theme if absent
```

Each import has one first resolved target. Ordered roots do not merge their
barrels or directories. `allowMultipleResolverRoots` controls fallback for
a binding; a distinct exact bare binding plus a prefix binding does not
itself require multi-root permission.

The private `@` alias also permits ordered roots for supported downstream
layouts. Its importer and target owners remain `lynx-website`; multiple roots
do not authorize consumer shadows or make `@/*` a portable document API.

Gate 2 must canonicalize both source roots and resolved files, including
pnpm package links. TypeScript ambient declarations may describe a module
without resolving to the runtime file; declaration/export compatibility
must be checked explicitly rather than comparing path strings alone.

## Lifecycle and Source Classification

Stable surfaces have a `changePolicy`; migration surfaces have a
`removalCondition`. The namespace and its direct import form may differ:
the `@lynx` barrel stays stable while direct component imports migrate.
Private `@/*` usage in portable documents is migration debt even though
the private namespace remains available inside its owner.

The explicit Gate 1 source map classifies implementation and producer areas.
It is not a complete importer map: `docs/en` and `docs/zh` mix website
content with synchronized producer content. The shared corpus layer for
Gates 2/3 derives destinations from producer manifests and applies the
website-owner fallback only to unmatched documents. That work introduces
the `lynx-stack` owner without adding an `@lynx-stack` alias.

Gate 2 owns corpus discovery and resolver verification; Gate 3 reuses the
corpus for importer policy and exact shrinking baselines. Assets and legacy
direct paths belong in that corpus/baseline, never in a second registry list.
