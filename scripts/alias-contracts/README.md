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
shared corpus layer, not by adding broad language trees to this registry.

Local resolver overrides require an exact specifier, reason, parity,
lifecycle, and removal condition. They describe declared exceptions, not
proof that a workaround is still needed. Gate 2 verifies resolver behavior
and removes obsolete keys together with their records.

## Downstream CLI Contract

Consumers supply physical data and optional private aliases without redefining
OSS owners or aliases:

| Option                          | Required module export | Default when omitted                                      |
| ------------------------------- | ---------------------- | --------------------------------------------------------- |
| `--source-map <module>`         | `sourceAreas`          | OSS source map                                            |
| `--resolver-overrides <module>` | `resolverOverrides`    | Empty with a consumer source map; otherwise OSS overrides |
| `--alias-extensions <module>`   | `aliasExtensions`      | Empty                                                     |

Modules may be `.mjs` or `.ts`. Paths resolve from the caller's working
directory; `file:` URLs are also accepted. Consumers must declare `tsx`
directly and run the checker with `node --import tsx`.
Each requested export must be an array; explicitly exporting `undefined`
is invalid and does not select the default for an omitted option.

The checker keeps a private snapshot of shared policy and deep-copies defaults
before loading any consumer module. Mutating registry exports cannot alter
the policy used by that invocation or later calls in the same process.

A replacement source map must retain **every OSS source-area ID and owner**,
including classification-only areas. Roots, roles, and origins may change
with the layout. New IDs must be consumer-owned. This is distinct from
`additionalOwners`, which governs where a particular alias may resolve.

The optional `boundary` marks documentation or runtime trees, including relocated
mounts. Shared IDs inherit their OSS boundary when omitted and cannot change it.
Site configuration modules outside either tree do not become runtime modules.

`moduleSpecifierFields` registers JSON generator settings on the area whose
owner will import them. Each entry names a repository-relative JSON `file` and
an array of property names in `path`. Only these values enter the corpus.
Missing files are permitted; present files must parse and contain string values.
Consumers register their own generator settings in their source map.
Namespace settings may name directories without a barrel; Gate 3 uses the
effective resolver's ordered roots to check their first existing target.
Gate 2 probes executable requests only.

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

Downstream sites invoke the installed entry directly:

```bash
node --import tsx \
  node_modules/@lynx-js/lynx-doc/scripts/alias-contracts/check-resolution.ts \
  --source-map ./scripts/alias-source-areas.mjs \
  --resolver-overrides ./scripts/resolver-overrides.mjs \
  --alias-extensions ./scripts/alias-extensions.ts
```

With `--source-map`, `docs/` and `sharedDocs/` are scanned only within declared
source areas; other documents and transitive producer packages are not inferred.
Mixed-ownership trees require explicit, non-overlapping areas for every region
that must be checked. Undeclared documents remain outside the corpus.

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
