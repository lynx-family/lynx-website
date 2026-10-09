# Understanding the Alias Contract

This guide explains the model in [`registry.ts`](./registry.ts). Read it before
editing the registry. Use the [README](./README.md) for the mechanical workflow,
CLI options, and verification commands.

## The Problem In One Example

An import specifier can remain unchanged while resolving to different physical
directories:

```ts
import { Bar } from '@foo/Bar';
```

The quoted text after `from`, `@foo/Bar`, is the **import specifier**. It is
the exact text that the resolver receives; it may name an alias, a package, or
a relative file.

Suppose `@foo` resolves to `src/foo` in one repository while a downstream site
searches several component roots in order. The physical layout is different,
but the import must still mean the same owner-controlled `Bar` module.

The registry separates that stable meaning from each repository's physical
resolver configuration:

```text
import specifier (`@foo/Bar`)
  -> alias contract: who owns it and which forms are public
  -> source-area ID: which logical source can implement it
  -> repository config: where that source physically lives here
```

`registry.ts` defines the first two steps. Rspress and TypeScript resolver
configuration implement the final step but do not define policy.

## The Five Concepts

### 1. Owner

An owner answers:

> Who may define or change the meaning of this interface?

The current owners are:

| Owner          | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `lynx-website` | Source maintained by the OSS `lynx-website` repository                 |
| `lynx-ui`      | Source and generated docs owned by the OSS `lynx-ui` repository        |
| `consumer`     | Host-owned configuration or content, for example from an in-house site |
| `rspress`      | APIs supplied by the active Rspress theme                              |

Owners are logical identities, not directory names.

### 2. Alias

An alias answers:

> Which alias name is reserved, and which imports under that name are
> supported across repositories?

For example, the `@lynx` record declares:

- `lynx-website` owns the interface;
- the bare `@lynx` import and reviewed subpaths are supported;
- source owned by the OSS `lynx-website` repository, source owned by the OSS
  `lynx-ui` repository, and source owned by the active consumer may import it;
- downstream sites must implement it;
- downstream sites may search ordered fallback roots.

The record does not say that `@lynx` physically means `src/components`.
That binding belongs to a source area and repository resolver configuration.

### 3. Public Subpath

A public subpath answers:

> Which subpath imports are intentionally portable?

These forms describe exact-path matching versus prefix matching. They do not
distinguish components from documentation:

- `module` exposes only one exact import, such as
  `@lynx/api-status/APIStatusLayout`. It does not expose imports below that
  path.
- `namespace` exposes the named path and its descendants. For example,
  `@docs/lynx-ui-button` also covers
  `@docs/lynx-ui-button/README.mdx` and
  `@docs/lynx-ui-button/README.zh.mdx`.

Resolver reachability is not enough. A file is portable only when the registry
declares it.

Asset namespaces are a temporary exception. `@assets` is in migration state,
so its namespaces describe existing compatibility, not a place to add new
imports.

### 4. Source Area

A source area answers:

> Which logical source may implement an alias, and where is it in this
> checkout?

Aliases reference stable source-area IDs such as `oss-components`. The OSS
source map binds that ID to `src/components`. A downstream source map must keep
the ID and owner but may bind it to a different physical root.

Roles describe how the tree is assembled:

- `authoritative`: maintained directly at this root;
- `mounted`: mounted or linked from another source;
- `generated`: assembled by generation or synchronization.

Mounted and generated areas record their canonical origins. This lets later
gates classify a final overlaid tree without redefining ownership.

### 5. Resolver Override

A resolver override answers:

> Which exact runtime exception cannot satisfy the portable alias model?

Overrides are not general aliases. They are narrow compatibility exceptions
with explicit runtime and TypeScript parity, lifecycle state, and removal
conditions.

The current registry has one override for Rspress's private React compatibility
entry, `@rspress/core/_private/react`. New overrides should be rare.

## Reading One Alias Record

Read an alias from top to bottom in this order:

```ts
{
  id: 'lynx-components',
  specifier: '@lynx',
  owner: 'lynx-website',
  visibility: 'public',
  kind: 'bare-and-subpaths',
  allowedImporters: ['lynx-website', 'lynx-ui', 'consumer'],
  supportsBare: true,
  publicSubpaths: [/* reviewed modules */],
  canonical: {
    omitIndex: true,
    omitSourceExtensions: true,
  },
  allowMultipleResolverRoots: true,
  sourceAreas: ['oss-components'],
  downstream: {
    implementation: 'required',
    mayExtendBare: true,
    subpathOwner: 'lynx-website',
  },
  lifecycle: {
    state: 'stable',
    removalPolicy: 'breaking-change',
  },
}
```

| Field                        | Question it answers                                     |
| ---------------------------- | ------------------------------------------------------- |
| `id`                         | What stable name do tools use for this contract?        |
| `specifier`                  | Which alias name does this contract define?             |
| `owner`                      | Who controls its meaning?                               |
| `visibility`                 | Is it public, private, or supplied by a framework/host? |
| `kind`                       | Are bare imports, subpaths, or both supported?          |
| `allowedImporters`           | Which owners may depend on it?                          |
| `publicSubpaths`             | Which subpath APIs are portable?                        |
| `canonical`                  | Which spellings are forbidden as non-canonical?         |
| `allowMultipleResolverRoots` | May a consumer search ordered roots?                    |
| `sourceAreas`                | Which logical source areas may implement it?            |
| `downstream`                 | What must a consumer provide or may it extend?          |
| `lifecycle`                  | Is this stable policy or migration debt?                |

## Current Alias Map

This table is an index, not a second policy registry. `registry.ts` remains
authoritative.

| Specifier    | Owner          | Supported form           | Purpose                                    | Lifecycle        |
| ------------ | -------------- | ------------------------ | ------------------------------------------ | ---------------- |
| `@lynx`      | `lynx-website` | bare + reviewed subpaths | Shared OSS documentation components        | stable           |
| `@lynx-ui`   | `lynx-website` | bare + reviewed subpaths | Components used by synced lynx-ui docs     | stable           |
| `@luna`      | `lynx-website` | exact bare import        | Portable Luna entry barrel                 | stable           |
| `@og-config` | `consumer`     | exact bare import        | Host-provided Open Graph configuration     | stable           |
| `@docs`      | `consumer`     | reviewed namespaces      | Synced package documentation               | stable           |
| `@assets`    | `consumer`     | reviewed subpaths        | Existing runtime public-asset imports      | migration        |
| `@theme`     | `rspress`      | bare + reviewed subpaths | Rspress theme adapter                      | stable           |
| `@site`      | `consumer`     | reviewed subpaths only   | Legacy host adapters                       | migration        |
| `@`          | `lynx-website` | private prefix           | OSS-private imports; not a public docs API | stable (private) |

Two distinctions matter:

- `@lynx-ui` is owned by `lynx-website` because the components themselves live
  here, even though synced lynx-ui documentation consumes them.
- `@assets` records existing runtime imports only. Documentation imports are
  forbidden, new consumers must not be added, and the alias should disappear
  after assets move to source-owned locations.
- `@` remains a stable owner-private alias for OSS implementation code. That
  does not recommend it for new documentation components: existing
  documentation `@/*` imports are temporarily supported, and an available
  `@lynx/*` contract or a relative import should be used instead.

## Current Source-Area Map

| Source-area ID           | Owner          | OSS root                   | Role          |
| ------------------------ | -------------- | -------------------------- | ------------- |
| `oss-components`         | `lynx-website` | `src/components`           | authoritative |
| `oss-lynx-ui-components` | `lynx-website` | `src/lynx-ui/components`   | authoritative |
| `oss-luna`               | `lynx-website` | `src/luna`                 | authoritative |
| `oss-open-graph-config`  | `consumer`     | `shared-og-config.ts`      | authoritative |
| `lynx-ui-package-docs`   | `lynx-ui`      | `sharedDocs/packageDocs`   | generated     |
| `site-public-assets`     | `consumer`     | `docs/public/assets`       | generated     |
| `oss-theme`              | `rspress`      | `theme`                    | authoritative |
| `oss-source-root`        | `lynx-website` | `src`                      | authoritative |
| `oss-hooks`              | `lynx-website` | `src/hooks`                | authoritative |
| `oss-libs`               | `lynx-website` | `src/libs`                 | authoritative |
| `oss-styles`             | `lynx-website` | `src/styles`               | authoritative |
| `oss-docs-en`            | `lynx-website` | `docs/en`                  | generated     |
| `oss-docs-zh`            | `lynx-website` | `docs/zh`                  | generated     |
| `oss-version-data`       | `lynx-website` | `docs/public/version.json` | authoritative |
| `lynx-ui-intro-docs`     | `lynx-website` | `sharedDocs/introDocs`     | authoritative |
| `site-route-config`      | `consumer`     | `shared-route-config.ts`   | authoritative |

Some areas classify legacy imports even when no portable alias currently
exposes them. Gate 3 still needs that ownership information to diagnose and
migrate those imports.

## Implementation Roadmap

The gate boundaries below are durable: they explain which layer owns each
responsibility. The implementation status is temporary and should be removed
or replaced with links to the completed checks after all gates land.

1. **Gate 1, implemented by PR #1514:** defines ownership, supported forms,
   lifecycle, and structural validation.
2. **Gate 2, planned in Issue #1504:** proves Rspress and TypeScript resolvers
   implement the same contract.
3. **Gate 3, planned in Issue #1505:** scans actual imports, classifies
   importer and target owners, and rejects forbidden or newly introduced
   migration imports.
4. **Later gates:** migrate legacy specifiers and remove compatibility aliases.

Gate 1 intentionally does not scan source imports or copy resolver mappings
into the registry. Keeping those responsibilities separate lets the policy
remain stable while repositories use different physical layouts.

## Deciding Where A Change Belongs

Use this rule:

- Change `registry.ts` when the supported cross-repository interface changes.
- Change a source map when only a repository's physical layout changes.
- Add an override only for an exact compatibility exception that cannot use a
  portable alias.
- Change resolver config to implement an existing contract, not to invent one.
- Change Gate 3's migration baseline when reducing known legacy usage.

Do not add a registry entry merely because a resolver can reach a file.
