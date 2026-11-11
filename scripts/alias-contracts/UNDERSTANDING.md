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

## Shared Hooks Across Runtime Mounts

Shared hooks live in OSS `src/hooks`. Consumers mount `src` as a tree, so
relative imports from `src/components` to `src/hooks` stay within that OSS
tree even when the consumer provides its own `src/hooks`. Consumers can mount
`theme` separately from `src`. Sharing a logical owner or a `runtime`
source-area boundary alone does not guarantee a stable relative mount layout
between those trees.

OSS theme code imports shared hooks through concrete private entries such as
`@/hooks/use-if-mobile`. A bare `@/hooks` request can instead resolve first
to a consumer's hook barrel. Re-exporting OSS hooks leaves that barrel
consumer-owned, so it cannot satisfy the private alias's target-owner policy.
Consumer-authored callers access their hook barrel through a declared
consumer-private alias or a relative import. Mounted OSS source retains its
OSS ownership and continues to use OSS-private entries.

`@theme/*` selects the active site's custom theme with framework fallback.
Use it only when that implementation choice is intentional; shared OSS hooks
use the private source entry to retain their implementation across themes.

## Lifecycle and Source Classification

Stable surfaces have a `changePolicy`; migration surfaces have a
`removalCondition`. The namespace and its direct import form may differ:
the `@lynx` barrel stays stable while direct component imports migrate.
Private `@/*` usage in portable documents is migration debt even though
the private namespace remains available inside its owner.

The explicit Gate 1 source map classifies implementation and producer areas.
It is not a complete importer map: `docs/en` and `docs/zh` mix website
content with synchronized producer content. The OSS integration adapter
derives destinations from producer manifests and applies the
website-owner fallback only to unmatched documents. That work introduces
the `lynx-stack` owner without adding an `@lynx-stack` alias.

Consumers can separately supply a preparation-derived `documentationCorpus`.
Its declared roots are scanned completely; final file owners and optional
syntax-request overrides classify importers without recording generation steps.
Each override binds its syntax index to the expected raw specifier. The verified
inventory is the only documentation importer entry point in prepared mode;
source areas continue to govern resolver targets and runtime discovery.
OSS publishes a final ownership snapshot for downstream synchronization. This
is an importer map, not an alias implementation source map. The
[prepared documentation contract](./README.md#prepared-consumer-documentation)
requires regeneration to zero and does not map migration allowances.

Gate 2 establishes the shared executable-import corpus and uses it for resolver
verification. Gate 3 reuses those records for import policy and exact
migration baselines. Concrete direct component paths are derived from observed
imports and belong only in Gate 3 data, never in the Gate 1 registry. The
retired `@assets/*` spelling is rejected directly by Gate 3 and has no alias or
source-area contract.

## Gate 2 Resolution Verification

Gate 1 validates that policy and consumer-supplied modules are structurally
sound. Gate 2 applies the resulting `ActiveContracts` to the prepared site's
actual runtime and TypeScript behavior:

| Module                | Responsibility                                                  |
| --------------------- | --------------------------------------------------------------- |
| `corpus.ts`           | Discover executable imports and classify each importer's owner. |
| `runtime.ts`          | Load the active Rspress configuration and real resolvers.       |
| `exports.ts`          | Reconstruct static ESM export identities and runtime values.    |
| `check-resolution.ts` | Apply policy across runtime and TypeScript probes.              |

`check-registry.ts` remains the policy boundary. Its `loadContracts()` helper
loads and validates the same `--source-map`, `--resolver-overrides`,
`--alias-extensions`, and optional `--documentation-corpus` modules for all three
gates, so later gates cannot reinterpret or bypass Gate 1 policy.

The corpus is syntax-only and ownership-aware. The runtime layer materializes
Rspress's real `web`, `node`, and `node_md` resolvers. The export reader follows
barrels without executing modules. The checker combines those inputs with
importer-relative TypeScript probes, including wrapper completeness and
generated negative alias shapes. Implementation details and supported syntax
are documented beside these public APIs.

Markdown prose, fenced examples, and stylesheet contents are outside the
corpus. JS/TS/MDX imports of stylesheets and assets remain visible; the build
owns style syntax and resolution. Alias-bearing CommonJS requests fail
explicitly because Gate 2 does not implement a CommonJS module analyzer.

OSS and accepted synthetic layouts block CI. Real downstream legacy mismatches
remain diagnostic until migration; do not weaken shared policy merely to make
them pass.

## Gate 3 Import Policy

`check-import-policy.ts` checks the same raw records independently of Gate 2's
export probes. Runtime imports use every effective compiler resolver. Erased
type imports use TypeScript resolution. Registered generator JSON fields carry
the generated source area's importer owner; directory namespace settings do
not pretend to be executable modules.

Migration diagnostics count syntax occurrences once across compiler environments.
The exact baseline lives with the importing repository. Hard target/source
violations remain failures even when the import also has a migration allowance.
Canonical spelling checks do not rewrite the resolver request.

Documentation/runtime boundary metadata follows relocated source areas. Ordinary
OSS locale documents use the corpus fallback, while producer destinations retain
manifest ownership. Generated violations cannot create their own baseline
entries. Current generated documentation is checked with zero debt; ownership
descriptions alone cannot grant an allowance for a duplicated import.
