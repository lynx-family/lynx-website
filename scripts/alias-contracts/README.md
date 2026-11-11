# Alias Contracts

The three gates of [#1487](https://github.com/lynx-family/lynx-website/issues/1487)
define portable alias policy, verify runtime/TypeScript resolution, and enforce
import policy with an exact migration baseline.

- [`registry.ts`](./registry.ts): owners, aliases, OSS source map, local overrides.
- [`types.ts`](./types.ts): field semantics and valid schema variants.
- [`check-registry.ts`](./check-registry.ts): structural validator and packaged CLI.
- [`check-resolution.ts`](./check-resolution.ts): actual Rspress/Rspack and
  TypeScript resolver check.
- [`check-import-policy.ts`](./check-import-policy.ts): import policy and exact
  baseline validation on the same raw corpus.
- [`boundary.ts`](./boundary.ts): shared relative-boundary policy and the
  documentation-only adapter used by Documentation Imports.
- [`import-policy-baseline.json`](./import-policy-baseline.json): scanner-derived
  OSS migration occurrences; no consumer findings.
- [`UNDERSTANDING.md`](./UNDERSTANDING.md): gate architecture, ownership,
  resolution, and analysis boundaries.

## Changing Policy

Update the owning registry record and its focused tests together. Keep physical
paths in source maps. Gates 2/3 derive concrete specifiers from source imports;
do not register component filenames, package-document lists, or asset inventories.

An implementation target must satisfy **both**:

1. Its source-area ID is in `implementationSources.requiredAreas`, or its
   owner is in `implementationSources.additionalOwners`.
2. Its owner is allowed for the import form: `bareTargetOwners` for a bare
   entry, `subpaths.targetOwners` for a direct subpath.

Gate 1 checks the policy's structure. Gate 2 applies these conditions to the
first resolved target. `additionalOwners` does not create new source-map IDs
or override source-map ownership rules.

The exact public host entries `@route-config` and `@version-data` preserve
the existing route configuration exports and default version metadata object.
Each host binds them in both Rspress runtime aliases (with an exact `$` key)
and TypeScript paths (without a wildcard). `site-route-config` identifies the
host route module; `oss-version-data` retains its existing ID and OSS owner
even when mounted. A host-owned version module can instead use an additional
consumer-owned area. Neither entry permits subpaths or barrel extensions.

`mayExtendBare: true` requires consumer target and additional-source permission.
A consumer wrapper must preserve all OSS barrel exports and may add unique
names. Direct subpaths retain their separate owner policy.

Source areas use normalized repository-relative roots. Mounted/generated areas
need non-empty `origins`; authoritative areas omit them. Explicit roots must
not overlap. Producer-derived importer classification is assembled by the
OSS adapter, not by adding broad language trees to this registry.

Local resolver overrides require an exact specifier, reason, parity,
lifecycle, and removal condition. They describe declared exceptions, not
proof that a workaround is still needed. Gate 2 verifies resolver behavior
and removes obsolete keys together with their records.

## Downstream CLI Contract

Consumers supply physical data and optional private aliases without redefining
OSS owners or aliases:

| Option                            | Required module export | Default when omitted                                      |
| --------------------------------- | ---------------------- | --------------------------------------------------------- |
| `--source-map <module>`           | `sourceAreas`          | OSS source map                                            |
| `--resolver-overrides <module>`   | `resolverOverrides`    | Empty with a consumer source map; otherwise OSS overrides |
| `--alias-extensions <module>`     | `aliasExtensions`      | Empty                                                     |
| `--documentation-corpus <module>` | `documentationCorpus`  | No additional prepared-document corpus                    |

Modules may be `.mjs` or `.ts`. Paths resolve from the caller's working
directory; `file:` URLs are also accepted. Consumers must declare `tsx`
directly and run the checker with `node --import tsx`.
Source maps, resolver overrides and alias extensions export arrays.
Source-map modules can also export `ownerExtensions` for documentation identities
(described below), and `documentationScope`, with complete documentation `roots`
and an optional `trackedSource: { id, owner }`.
All executable files in that scope require ownership, including files
without imports. Only Git-tracked files may use the declared authoritative
fallback; generated areas and final prepared-file ownership take precedence.
Package lookup and manifest conversion belong to the site's integration
layer. Shared checkers read this contract without selecting producer packages.
`documentationCorpus` exports an object described below. Explicitly exporting
`undefined` is invalid and does not select the default for an omitted option.

The checker keeps a private snapshot of shared policy and deep-copies defaults
before loading any consumer module. Mutating registry exports cannot alter
the policy used by that invocation or later calls in the same process.

A replacement source map must retain **every OSS source-area ID and owner**,
including classification-only areas. Roots, roles, and origins may change
with the layout. New IDs must be consumer-owned or belong to a registered
documentation owner. This is distinct from
`additionalOwners`, which governs where a particular alias may resolve.

The optional `boundary` marks documentation or runtime trees, including relocated
mounts. Shared IDs inherit their OSS boundary when omitted and cannot change it.
Documentation source areas cannot overlap canonical runtime roots, regardless
of owner.
Site configuration modules outside either tree do not become runtime modules.

`moduleSpecifierFields` registers JSON generator settings on the area whose
owner will import them. Each entry names a repository-relative JSON `file` and
an array of property names in `path`. Only these values enter the corpus.
Missing files are permitted; present files must parse and contain string values.
Consumers register their own generator settings in their source map.
Namespace settings may name directories without a barrel; Gate 3 uses the
effective resolver's ordered roots to check their first existing target.
They obey importer and implementation ownership, rather than executable bare/
subpath spelling rules. TypeScript may retain a bare directory mapping for a
subpaths-only namespace, as used by shadcn configuration; executable imports
still require the supported subpath form. Gate 2 probes executable requests only.

The following is a **partial excerpt**, not a complete replacement map:

```js
// scripts/alias-source-areas.mjs
// @ts-check
/** @typedef {import('@lynx-js/lynx-doc/scripts/alias-contracts/types.js').SourceArea} SourceArea */
/** @satisfies {readonly SourceArea[]} */
export const sourceAreas = [
  // Include all OSS IDs with this consumer's physical mappings.
  {
    id: 'consumer-component-entry',
    root: 'src/entries/components.ts',
    owner: 'consumer',
    role: 'authoritative',
  },
  {
    id: 'consumer-local-source',
    root: 'src/local',
    owner: 'consumer',
    role: 'authoritative',
  },
];
```

For local exceptions, a separate module exports `resolverOverrides`; export
`[]` explicitly when using an empty override module.

```bash
node --import tsx \
  node_modules/@lynx-js/lynx-doc/scripts/alias-contracts/check-registry.ts \
  --source-map ./scripts/alias-source-areas.mjs \
  --resolver-overrides ./scripts/resolver-overrides.mjs \
  --alias-extensions ./scripts/alias-extensions.ts
```

The packaged checker path, option names, module export names, and
caller-working-directory behavior are downstream compatibility interfaces.

### Prepared Consumer Documentation

With `--source-map`, consumers can additionally pass
`--documentation-corpus ./generated/documentation-corpus.mjs`. This module
exports a `DocumentationCorpus` from [`types.ts`](./types.ts). All three
entries accept it; Gate 1 validates its schema, and Gates 2/3 verify complete
output coverage, final hashes and importer permissions after prepare.

Call `snapshotDocumentation(cwd, roots, ownership, canonical)` from the packaged
[`documentation-corpus.ts`](./documentation-corpus.ts) once at the end of prepare.
The helper walks the final trees and computes hashes; the site's `ownership`
callback returns `{ owner, origins?, imports? }` for each final file. Import
`canonical` from the packaged [`corpus.ts`](./corpus.ts). Keep this generated
module in an ignored directory; do not maintain a second filename inventory.

| Field     | Contract                                                                             |
| --------- | ------------------------------------------------------------------------------------ |
| `roots`   | Non-overlapping repository-relative prepared directories.                            |
| `files`   | Every executable output's `{ file, sha256, owner, origins?, imports? }` record.      |
| `owner`   | Default importer owner for the final file.                                           |
| `imports` | Optional `{ index, specifier, owner, origins? }` overrides for mixed-owner requests. |
| `origins` | Optional canonical `{ repository, root }` metadata.                                  |

`file` paths resolve from the caller's working directory. `owner` references a
registered identity. Final file ownership overrides physical importer mappings,
including the tracked-document fallback. `sha256` hashes final UTF-8 content
and must match the current file; `documentationDigest` computes this hash.

`index` is zero-based syntax order returned by `parseImports(file, content)`
in [`corpus.ts`](./corpus.ts), **before** the corpus sorts requests for diagnostics.
It includes all recognized static module requests, including re-exports and
static dynamic imports. `specifier` must exactly match the raw request at that
index, including query/hash suffixes. A mismatch requires regenerating the
annotations; refreshing the file hash alone does not rebind them. Plain Markdown
has no executable requests. Duplicate, negative or nonexistent indices fail;
an import's owner is its override or the file owner. This check does not
distinguish requests with identical specifiers or prove ownership authenticity.

Synchronized files inherit the upstream file owner. Local additions and full
overrides declare the consumer owner. Prose, link and frontmatter edits can
retain the file owner; only mixed-owner executable imports need overrides.
Same-owner generation and rewriting need no operation records. The checker
accepts the site's ownership declarations and does not prove their authenticity
or validate source files, composition steps or full-text edit history.
The previous `sources`/`segments` schema is retired and fails with a migration
diagnostic.

OSS `prepare` publishes `scripts/alias-contracts/documentation-corpus.json` after
all generators finish; `pnpm prepare:alias-corpus` refreshes it independently.
It retains website, lynx-ui, lynx-stack and skills ownership from the OSS adapter.
Downstream preparation reads it from its prepared OSS checkout or installed
package, inherits ownership for synchronized files, applies final local
ownership decisions, then snapshots its own complete trees. The consumer
does not need hooks in every generator or to simulate producer composition.

In prepared mode, the verified inventory is the only documentation importer
entry point. Scope and documentation source areas do not add importers or
classify prepared file owners. Source areas continue to classify resolver
targets, enforce documentation/runtime boundaries, and discover runtime source
and registered configuration values.

Gates 2/3 walk every declared root, including untracked `.md`, `.mdx`, JS and
TS files, including files without imports. They reject missing roots, stale
outputs, undeclared or missing executable files and duplicate canonical files.
Hidden/dependency directories and `docs/public`
resources stay outside the executable corpus. Declare complete documentation
trees, not public resource directories.

This input classifies **importers only**. It neither registers alias targets
nor extends their implementation permissions. Relocated output roots retain
the documentation boundary in both directions and cannot overlap runtime
areas or escape their roots through symlinks.

For a site-local producer, export `ownerExtensions` from the source-map module:

```ts
export const ownerExtensions = [
  {
    id: 'consumer:tools-docs',
    description: 'Tools documentation',
    scope: 'documentation',
  },
];
```

`SourceArea.owner`, `PreparedDocument.owner` and import overrides reference this same ID.
An extension uses `consumer:<name>` with lowercase words separated by hyphens.
It cannot replace shared owners or participate in alias ownership, importer
lists or target permissions. Its source areas require `boundary: 'documentation'`
and cannot declare generator module-specifier fields or overlap runtime mounts.
Use a source area for a tree with one owner; use final import overrides for mixed outputs.
Extended owners follow the public aliases' existing `consumer` import policy,
including canonical spelling and migration checks. They gain no access to
consumer-private aliases; generated imports still require zero migration debt.
Package lookup and manifest conversion belong to the site's preparation adapter.

Every prepared import is generated and receives no independent migration
allowance, even when copied unchanged. Migrate authoritative sources and
generator settings, then regenerate to zero. Authoritative-to-generated
allowance mapping is deferred; final hashes and canonical origins do not
establish occurrence identity.

```bash
node --import tsx \
  node_modules/@lynx-js/lynx-doc/scripts/alias-contracts/check-import-policy.ts \
  --source-map ./scripts/alias-source-areas.mjs \
  --documentation-corpus ./generated/documentation-corpus.mjs \
  --baseline ./scripts/import-policy-baseline.json
```

### Consumer Private Aliases

Use an extension for unrelated site-local source, such as generated UI.
`ConsumerAliasExtension` narrows the existing `AliasContract` schema:

- Owner, allowed importers, and bare/direct target owners must all be `consumer`;
  visibility must be `owner-private`.
- `implementationSources.requiredAreas` must list at least one declared
  consumer-owned area. `additionalOwners` must be empty, so this list bounds
  implementation sources even if more consumer areas are added later.
- IDs and accepted import specifiers must not collide with shared aliases,
  other extensions, or resolver overrides. All three alias shapes are supported.

```ts
// scripts/alias-extensions.ts
import type { ConsumerAliasExtension } from '@lynx-js/lynx-doc/scripts/alias-contracts/types.js';

export const aliasExtensions = [
  {
    id: 'consumer-local',
    specifier: '@local',
    owner: 'consumer',
    visibility: 'owner-private',
    kind: 'subpaths-only',
    allowedImporters: ['consumer'],
    subpaths: {
      targetOwners: ['consumer'],
      lifecycle: { state: 'stable', changePolicy: 'owner-controlled' },
    },
    canonical: { omitIndex: false, omitSourceExtensions: false },
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['consumer-local-source'],
      additionalOwners: [],
    },
    downstream: { implementation: 'required' },
    lifecycle: { state: 'stable', changePolicy: 'owner-controlled' },
  },
] as const satisfies readonly ConsumerAliasExtension[];
```

The prefix is chosen by the consumer, not registered in OSS. These records
apply only when supplied; `downstream.implementation` does not oblige other
sites to implement this local alias. `mayExtendBare` on shared aliases still
governs extension of their OSS barrels; local bare entries set it to `false`
and own their exports directly.

Adding policy does not configure a resolver or rewrite imports. Configure the
site's runtime and TypeScript aliases, update code-generator alias settings,
and migrate consumer-local imports together.

## Verification

```bash
pnpm check:aliases
pnpm run prepare
pnpm check:alias-resolution
pnpm check:import-policy
pnpm run build
```

`check:aliases` runs types and all three gates' fixtures, including packaged
consumer CLI checks, without prepare. The required `Alias Contracts` CI job
runs this suite after installing with lifecycle scripts disabled. `Validate`
checks the real prepared corpus and build.

Documentation Imports retains its existing command and tracked-document scan
without prepare. Its entry delegates parsing, boundary checks and suggestions
to Gate 3's documentation adapter; it does not load site configuration,
initialize resolvers or require a migration baseline. Frozen fixtures preserve
the former parser semantics, diagnostic locations and occurrence counts. The
shared policy additionally rejects literal CommonJS requests and physical
symlink crossings. Lexical prohibitions remain enforced even if a resolver
redirects a relative request; missing targets and query/hash modifiers cannot
waive them.

Alias matching, bare/subpath permissions, resolver-override policy and canonical
spelling use the resource path before the first `?` or `#`. Resolvers and
TypeScript receive the complete request; diagnostics, baseline keys and
replacement suffixes retain its modifiers. A modifier does not waive ownership
or source-area checks.

An importer reached through `docs/` or `sharedDocs/` retains its documentation
constraint even if its symlink points into runtime source. Canonical ownership
and the physical boundary still apply. Mount deduplication preserves this
constraint while counting each physical syntax occurrence once.

Run `check:alias-resolution` from the active site's repository root after
prepare. It accepts the same three consumer modules as `check-registry.ts` and
uses the site's effective Rspress web/SSG resolvers and TypeScript configuration.

Direct Gate 2/3 CLI calls require `--source-map`. Calls without a source map fail
with a diagnostic directing OSS users to `oss.ts resolution` or `oss.ts imports`;
the package scripts already use these adapters.

Downstream sites invoke the installed entry directly:

```bash
node --import tsx \
  node_modules/@lynx-js/lynx-doc/scripts/alias-contracts/check-resolution.ts \
  --source-map ./scripts/alias-source-areas.mjs \
  --resolver-overrides ./scripts/resolver-overrides.mjs \
  --alias-extensions ./scripts/alias-extensions.ts
```

With `--source-map`, unprepared documentation is scanned within declared source
areas and optional `documentationScope` roots. With `--documentation-corpus`,
only its verified inventory supplies documentation importers; other documents
and transitive producer packages are not inferred. A source map without either
documentation input retains its existing scope. Prepared mixed-owner trees use
the final ownership input above rather than broad consumer-owned source areas.

For downstream contract changes, also run `pnpm run build` and
`pnpm pack --dry-run`, then obtain packaged-checker, prepare, resolver-check,
and build results against the exact candidate pin. Do not add policy exceptions
for pre-existing downstream migration debt. See
[UNDERSTANDING.md](./UNDERSTANDING.md#gate-2-resolution-verification) for the
corpus, runtime, export-surface, and syntax boundaries.

## Import Policy and Baseline Shrinking

Gate 3 checks importer permissions, private-owner closure, first resolved target
ownership and source-area bounds, public spelling, direct resolver-override
imports, and relative imports in both directions across documentation/runtime
trees. The retired `@assets` spelling is rejected for documentation and runtime
imports; documentation uses approved CDN URLs, while runtime assets belong to
their importing source. Layout-dependent runtime version-data imports are debt
until their reviewed adapter exists.

The baseline contains exact `{ rule, file, specifier, count }` records. It is
not a wildcard allowlist or a resolver target inventory. A new file, moved
import, changed spelling, increased count, duplicate entry, or stale entry fails.
Resolution, target ownership, alias shape, and forbidden documentation assets
cannot be hidden by a baseline. Consumer use of OSS-private imports is recorded
only in the consumer's baseline; valid private extensions add no debt.

Migrate the authoritative source or registered generator settings first, run
prepare, then remove or reduce the affected baseline entries in the same change.
Do not add allowances to make new imports pass. `--report` emits diagnostics and
the observed inventory as JSON for investigation; it never changes the baseline.
Diagnostics include rule, file, raw specifier, importer/target owners and
replacement category. The initial OSS baseline was derived from this inventory.

Generated outputs are checked after prepare and cannot receive independent
baseline allowances. Current generated documentation has no migration debt.
Canonical mounts are scanned once. A future generator that duplicates an
authoritative violating import must first provide an explicit occurrence mapping
so output validation can reuse that allowance; repository/root `origins` metadata
alone does not establish that relationship.

The OSS package scripts invoke [`oss.ts`](./oss.ts), which supplies the
site's default contracts to Gates 2/3. Its `documentationScope` covers the
complete prepared `docs/` and `sharedDocs/` trees. Every executable file
needs an owner and source role, including
files without imports. Only Git-tracked site documents receive the
authoritative website fallback. Unregistered copied/generated files fail
coverage, even when they import only ordinary npm packages.

The OSS adapter looks up lynx-stack and skills manifests and translates
their destination data into source areas with explicit owner and origin
bindings. Shared corpus and CLI code contain no producer package names or
manifest schemas. Skills `sections` include localized MDX and scenario TS;
`sharedContent` includes shared TSX support modules. These copies retain
producer ownership and generated roles. Public assets remain excluded.
Adding a producer requires registering its owner and preparation-derived
source areas; no alias or filename inventory is required. Coverage does
not verify npm dependency declarations or the host rendering environment,
and a missing declaration cannot be excused by a migration baseline.

Consumers run Gate 3 after their own prepare with an explicit local JSON baseline
(`[]` when there is no debt):

```bash
node --import tsx \
  node_modules/@lynx-js/lynx-doc/scripts/alias-contracts/check-import-policy.ts \
  --source-map ./scripts/alias-source-areas.mjs \
  --resolver-overrides ./scripts/resolver-overrides.mjs \
  --alias-extensions ./scripts/alias-extensions.ts \
  --baseline ./scripts/import-policy-baseline.json
```

The baseline path resolves against the caller's working directory. Omitting it
with a consumer source map is an error; consumers never inherit the OSS baseline.
Keep private paths out of public reports and return only counts by rule.
